// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{linera_base_types::WithServiceAbi, views::View, Service, ServiceRuntime};
use linera_roulette::{RouletteAbi, GameState, Player};
use self::state::RouletteState;

linera_sdk::service!(RouletteService);

pub struct RouletteService {
    state: RouletteState,
    runtime: Arc<ServiceRuntime<Self>>,
}

impl WithServiceAbi for RouletteService {
    type Abi = RouletteAbi;
}

impl Service for RouletteService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = RouletteState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        RouletteService { state, runtime: Arc::new(runtime) }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                game: self.state.game.get().clone(),
                players: self.get_all_players().await,
                my_player: self.state.my_player.get().clone(),
                is_host: *self.state.is_host.get(),
                host_chain_id: self.state.host_chain_id.get().clone(),
            },
            MutationRoot { runtime: self.runtime.clone() },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

impl RouletteService {
    async fn get_all_players(&self) -> Vec<Player> {
        let mut players = Vec::new();
        self.state.players.for_each_index_value(|_, value| {
            players.push(value.into_owned());
            Ok(())
        }).await.unwrap();
        players
    }
}

struct QueryRoot {
    game: GameState,
    players: Vec<Player>,
    my_player: Option<Player>,
    is_host: bool,
    host_chain_id: Option<String>,
}

#[Object]
impl QueryRoot {
    async fn game_state(&self) -> &GameState { &self.game }
    async fn players(&self) -> &Vec<Player> { &self.players }
    async fn player(&self, chain_id: String) -> Option<Player> {
        self.players.iter().find(|p| p.chain_id == chain_id).cloned()
    }
    async fn current_bets(&self) -> &Vec<linera_roulette::Bet> { &self.game.current_bets }
    async fn last_result(&self) -> Option<&linera_roulette::SpinResult> { self.game.last_result.as_ref() }
    async fn history(&self) -> &Vec<u8> { &self.game.history }
    async fn is_spinning(&self) -> bool { self.game.is_spinning }
    async fn player_balance(&self, chain_id: String) -> u64 {
        self.players.iter().find(|p| p.chain_id == chain_id).map_or(0, |p| p.balance)
    }
    async fn total_pot(&self) -> u64 { self.game.current_bets.iter().map(|b| b.amount).sum() }
    async fn my_player(&self) -> Option<&Player> { self.my_player.as_ref() }
    async fn am_i_host(&self) -> bool { self.is_host }
    async fn host_chain_id(&self) -> Option<&String> { self.host_chain_id.as_ref() }
}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<RouletteService>>,
}

#[Object]
impl MutationRoot {
    async fn register_player(&self, player_id: String, name: String, initial_balance: i32) -> String {
        self.runtime.schedule_operation(&linera_roulette::Operation::RegisterPlayer {
            player_id: player_id.clone(),
            name: name.clone(),
            initial_balance: initial_balance as u64,
        });
        format!("Registered {} with balance {}", name, initial_balance)
    }

    async fn place_bet(&self, player_id: String, bet_type: linera_roulette::BetType, numbers: Vec<i32>, amount: i32) -> String {
        self.runtime.schedule_operation(&linera_roulette::Operation::PlaceBet {
            player_id,
            bet_type,
            numbers: numbers.into_iter().map(|n| n as u8).collect(),
            amount: amount as u64,
        });
        format!("Bet placed: {:?} amount {}", bet_type, amount)
    }

    async fn start_round(&self) -> String {
        self.runtime.schedule_operation(&linera_roulette::Operation::StartRound);
        "Round started".to_string()
    }

    async fn spin_wheel(&self) -> String {
        self.runtime.schedule_operation(&linera_roulette::Operation::SpinWheel);
        "Spinning".to_string()
    }
}
