// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_roulette::{Operation, RouletteAbi, Player, Bet, SpinResult, Winner, GameState, get_color, Message, InstantiationArgument};
use linera_sdk::{
    linera_base_types::{WithContractAbi, ChainId},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use sha2::{Sha256, Digest};
use std::str::FromStr;
use std::collections::HashMap;
use self::state::RouletteState;

linera_sdk::contract!(RouletteContract);

pub struct RouletteContract {
    state: RouletteState,
    runtime: ContractRuntime<Self>,
}

impl WithContractAbi for RouletteContract {
    type Abi = RouletteAbi;
}

impl Contract for RouletteContract {
    type Message = Message;
    type InstantiationArgument = InstantiationArgument;
    type Parameters = ();
    type EventValue = linera_roulette::RouletteEvent;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = RouletteState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        RouletteContract { state, runtime }
    }

    async fn instantiate(&mut self, argument: InstantiationArgument) {
        match argument.host_chain_id {
            Some(host_id) => {
                self.state.is_host.set(false);
                self.state.host_chain_id.set(Some(host_id));
            }
            None => {
                self.state.is_host.set(true);
                self.state.host_chain_id.set(None);
                self.state.game.set(GameState::new());
            }
        }
    }

    async fn execute_operation(&mut self, operation: Operation) {
        let is_host = *self.state.is_host.get();
        let chain_id = self.runtime.chain_id().to_string();

        if !is_host {
            if let Some(host_chain_id_str) = self.state.host_chain_id.get().clone() {
                if let Ok(host_chain) = ChainId::from_str(&host_chain_id_str) {
                    match operation {
                        Operation::RegisterPlayer { name, initial_balance, .. } => {
                            self.runtime
                                .prepare_message(Message::RegisterPlayerRequest { name, initial_balance })
                                .with_tracking()
                                .send_to(host_chain);
                        }
                        Operation::PlaceBet { bet_type, numbers, amount, .. } => {
                            let player_name = self.state.my_player.get()
                                .as_ref()
                                .map(|p| p.name.clone())
                                .unwrap_or_default();
                            self.runtime
                                .prepare_message(Message::PlaceBetRequest { bet_type, numbers, amount, player_name })
                                .with_tracking()
                                .send_to(host_chain);
                        }
                        Operation::SpinWheel => {
                            self.runtime
                                .prepare_message(Message::SpinWheelRequest { player_chain_id: chain_id })
                                .with_tracking()
                                .send_to(host_chain);
                        }
                        _ => {}
                    }
                }
            }
            return;
        }

        match operation {
            Operation::RegisterPlayer { player_id, name, initial_balance } => {
                if let Ok(Some(_)) = self.state.players.get(&player_id).await {
                    return;
                }
                let player = Player { chain_id: player_id.clone(), name: name.clone(), balance: initial_balance };
                let _ = self.state.players.insert(&player_id, player.clone());
                let _ = self.state.player_chains.insert(&player_id);
                let timestamp = self.runtime.system_time().micros().to_string();
                self.runtime.emit("roulette_events".into(), &linera_roulette::RouletteEvent::PlayerRegistered { player, timestamp });
            }

            Operation::PlaceBet { player_id, bet_type, numbers, amount } => {
                let mut player = match self.state.players.get(&player_id).await {
                    Ok(Some(p)) => p,
                    _ => return,
                };
                if player.balance < amount { return; }
                let mut game = self.state.game.get().clone();
                if game.is_spinning { return; }

                player.balance -= amount;
                let _ = self.state.players.insert(&player_id, player.clone());

                let bet = Bet {
                    player_chain_id: player_id,
                    player_name: player.name.clone(),
                    bet_type,
                    numbers,
                    amount,
                };
                game.current_bets.push(bet.clone());
                self.state.game.set(game);

                let timestamp = self.runtime.system_time().micros().to_string();
                self.runtime.emit("roulette_events".into(), &linera_roulette::RouletteEvent::BetPlaced { bet, timestamp });
            }

            Operation::StartRound => {
                let now_ms = self.runtime.system_time().micros() / 1000;
                let mut game = self.state.game.get().clone();
                game.betting_end_time = Some(now_ms + 30_000);
                self.state.game.set(game);
            }

            Operation::SpinWheel => {
                let mut game = self.state.game.get().clone();
                if game.is_spinning || game.current_bets.is_empty() { return; }
                game.is_spinning = true;
                self.state.game.set(game.clone());
                let result = self.generate_random_number(&game);
                let timestamp = self.runtime.system_time().micros().to_string();
                self.settle_bets_internal(result, timestamp).await;
            }

            Operation::SettleBets { result } => {
                let timestamp = self.runtime.system_time().micros().to_string();
                self.settle_bets_internal(result, timestamp).await;
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        let sender_chain = self.runtime.message_origin_chain_id().expect("Missing origin chain");

        match message {
            Message::RegisterPlayerRequest { name, initial_balance } => {
                let chain_id = sender_chain.to_string();
                if let Ok(Some(_)) = self.state.players.get(&chain_id).await {
                    self.runtime
                        .prepare_message(Message::PlayerRegisteredConfirm {
                            player: Player { chain_id, name, balance: 0 },
                            success: false,
                            error_message: Some("Already registered".to_string()),
                        })
                        .with_tracking()
                        .send_to(sender_chain);
                    return;
                }

                let player = Player { chain_id: chain_id.clone(), name, balance: initial_balance };
                let _ = self.state.players.insert(&chain_id, player.clone());
                let _ = self.state.player_chains.insert(&chain_id);

                let timestamp = self.runtime.system_time().micros().to_string();
                self.runtime.emit("roulette_events".into(), &linera_roulette::RouletteEvent::PlayerRegistered {
                    player: player.clone(),
                    timestamp,
                });

                self.runtime
                    .prepare_message(Message::PlayerRegisteredConfirm { player, success: true, error_message: None })
                    .with_tracking()
                    .send_to(sender_chain);
            }

            Message::PlaceBetRequest { bet_type, numbers, amount, player_name } => {
                let chain_id = sender_chain.to_string();
                let mut player = match self.state.players.get(&chain_id).await {
                    Ok(Some(p)) => p,
                    _ => {
                        self.runtime
                            .prepare_message(Message::BetPlacedConfirm {
                                bet: Bet { player_chain_id: chain_id, player_name, bet_type, numbers, amount },
                                success: false,
                                new_balance: 0,
                                error_message: Some("Not registered".to_string()),
                            })
                            .with_tracking()
                            .send_to(sender_chain);
                        return;
                    }
                };

                if player.balance < amount {
                    self.runtime
                        .prepare_message(Message::BetPlacedConfirm {
                            bet: Bet { player_chain_id: chain_id, player_name, bet_type, numbers, amount },
                            success: false,
                            new_balance: player.balance,
                            error_message: Some("Insufficient balance".to_string()),
                        })
                        .with_tracking()
                        .send_to(sender_chain);
                    return;
                }

                let mut game = self.state.game.get().clone();
                if game.is_spinning {
                    self.runtime
                        .prepare_message(Message::BetPlacedConfirm {
                            bet: Bet { player_chain_id: chain_id, player_name, bet_type, numbers, amount },
                            success: false,
                            new_balance: player.balance,
                            error_message: Some("Wheel spinning".to_string()),
                        })
                        .with_tracking()
                        .send_to(sender_chain);
                    return;
                }

                player.balance -= amount;
                let new_balance = player.balance;
                let _ = self.state.players.insert(&chain_id, player);

                let bet = Bet { player_chain_id: chain_id.clone(), player_name, bet_type, numbers, amount };
                game.current_bets.push(bet.clone());
                self.state.game.set(game);

                let timestamp = self.runtime.system_time().micros().to_string();
                self.runtime.emit("roulette_events".into(), &linera_roulette::RouletteEvent::BetPlaced {
                    bet: bet.clone(),
                    timestamp,
                });

                self.runtime
                    .prepare_message(Message::BetPlacedConfirm { bet, success: true, new_balance, error_message: None })
                    .with_tracking()
                    .send_to(sender_chain);
            }

            Message::PlayerRegisteredConfirm { player, success, .. } => {
                if success {
                    let chain_id = player.chain_id.clone();
                    let _ = self.state.players.insert(&chain_id, player.clone());
                    self.state.my_player.set(Some(player));
                }
            }

            Message::BetPlacedConfirm { bet, success, new_balance, .. } => {
                if success {
                    if let Ok(Some(mut player)) = self.state.players.get(&bet.player_chain_id).await {
                        player.balance = new_balance;
                        let _ = self.state.players.insert(&bet.player_chain_id, player);
                    }
                }
            }

            Message::SpinResultBroadcast { result, new_balance, .. } => {
                let mut game = self.state.game.get().clone();
                game.last_result = Some(result);
                game.is_spinning = false;
                self.state.game.set(game);

                let chain_id = self.runtime.chain_id().to_string();
                if let Ok(Some(mut player)) = self.state.players.get(&chain_id).await {
                    player.balance = new_balance;
                    let _ = self.state.players.insert(&chain_id, player);
                }
            }

            Message::BalanceUpdate { new_balance, .. } => {
                let chain_id = self.runtime.chain_id().to_string();
                if let Ok(Some(mut player)) = self.state.players.get(&chain_id).await {
                    player.balance = new_balance;
                    let _ = self.state.players.insert(&chain_id, player);
                }
            }

            Message::SpinWheelRequest { .. } => {
                if !*self.state.is_host.get() { return; }
                let mut game = self.state.game.get().clone();
                if game.is_spinning || game.current_bets.is_empty() { return; }
                game.is_spinning = true;
                self.state.game.set(game.clone());
                let result = self.generate_random_number(&game);
                let timestamp = self.runtime.system_time().micros().to_string();
                self.settle_bets_internal(result, timestamp).await;
            }
        }
    }

    async fn process_streams(&mut self, _streams: Vec<linera_sdk::linera_base_types::StreamUpdate>) {}

    async fn store(mut self) {
        let _ = self.state.save().await;
    }
}

impl RouletteContract {
    fn generate_random_number(&mut self, game: &GameState) -> u8 {
        let mut hasher = Sha256::new();
        hasher.update(self.runtime.system_time().micros().to_le_bytes());
        hasher.update(self.runtime.chain_id().to_string().as_bytes());
        hasher.update(self.runtime.block_height().0.to_le_bytes());
        for bet in &game.current_bets {
            hasher.update(bet.player_chain_id.as_bytes());
            hasher.update(bet.amount.to_le_bytes());
            hasher.update(&bet.numbers);
        }
        hasher.update((game.current_bets.len() as u64).to_le_bytes());
        let hash = hasher.finalize();
        let bytes: [u8; 8] = hash[0..8].try_into().unwrap_or([0u8; 8]);
        (u64::from_le_bytes(bytes) % 37) as u8
    }

    async fn settle_bets_internal(&mut self, result: u8, timestamp: String) {
        let mut game = self.state.game.get().clone();
        let color = get_color(result);
        let mut winners = Vec::new();
        let mut player_payouts: HashMap<String, (u64, u64, bool)> = HashMap::new();

        for bet in &game.current_bets {
            player_payouts.entry(bet.player_chain_id.clone()).or_insert((0, 0, false));
        }

        for bet in &game.current_bets {
            let is_winner = bet.bet_type.is_winner(result, &bet.numbers);
            let payout = if is_winner { bet.amount + (bet.amount * bet.bet_type.payout_multiplier()) } else { 0 };

            if let Ok(Some(mut player)) = self.state.players.get(&bet.player_chain_id).await {
                if is_winner {
                    player.balance += payout;
                    let _ = self.state.players.insert(&bet.player_chain_id, player.clone());
                    winners.push(Winner {
                        player_chain_id: bet.player_chain_id.clone(),
                        player_name: bet.player_name.clone(),
                        bet_type: bet.bet_type,
                        bet_amount: bet.amount,
                        payout,
                    });
                }
                if let Some(entry) = player_payouts.get_mut(&bet.player_chain_id) {
                    entry.0 += payout;
                    entry.1 = player.balance;
                    if is_winner { entry.2 = true; }
                }
            }
        }

        let spin_result = SpinResult { number: result, color, timestamp: timestamp.clone(), winners };

        game.history.push(result);
        if game.history.len() > 10 { game.history.remove(0); }

        let bets_to_broadcast = game.current_bets.clone();
        game.current_bets.clear();
        game.last_result = Some(spin_result.clone());
        game.is_spinning = false;
        game.betting_end_time = None;
        self.state.game.set(game);

        for bet in &bets_to_broadcast {
            if let Ok(player_chain) = ChainId::from_str(&bet.player_chain_id) {
                let (payout, new_balance, won) = player_payouts.get(&bet.player_chain_id).cloned().unwrap_or((0, 0, false));
                self.runtime
                    .prepare_message(Message::SpinResultBroadcast {
                        result: spin_result.clone(),
                        player_payout: payout,
                        new_balance,
                        won,
                    })
                    .with_tracking()
                    .send_to(player_chain);
            }
        }

        self.runtime.emit("roulette_events".into(), &linera_roulette::RouletteEvent::WheelSpun {
            result: spin_result,
            timestamp: timestamp.clone(),
        });
        self.runtime.emit("roulette_events".into(), &linera_roulette::RouletteEvent::BetsSettled { timestamp });
    }
}
