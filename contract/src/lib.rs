// SPDX-License-Identifier: Apache-2.0

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub struct RouletteAbi;

impl ContractAbi for RouletteAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for RouletteAbi {
    type Query = Request;
    type QueryResponse = Response;
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
#[graphql(rename_fields = "camelCase")]
pub struct Player {
    pub chain_id: String,
    pub name: String,
    pub balance: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq)]
pub enum BetType {
    Straight,
    Red,
    Black,
    Even,
    Odd,
    Low,
    High,
    FirstDozen,
    SecondDozen,
    ThirdDozen,
    FirstColumn,
    SecondColumn,
    ThirdColumn,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
#[graphql(rename_fields = "camelCase")]
pub struct Bet {
    pub player_chain_id: String,
    pub player_name: String,
    pub bet_type: BetType,
    pub numbers: Vec<u8>,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
#[graphql(rename_fields = "camelCase")]
pub struct SpinResult {
    pub number: u8,
    pub color: String,
    pub timestamp: String,
    pub winners: Vec<Winner>,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
#[graphql(rename_fields = "camelCase")]
pub struct Winner {
    pub player_chain_id: String,
    pub player_name: String,
    pub bet_type: BetType,
    pub bet_amount: u64,
    pub payout: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, async_graphql::SimpleObject)]
#[graphql(rename_fields = "camelCase")]
pub struct GameState {
    #[serde(default)]
    pub is_spinning: bool,
    #[serde(default)]
    pub current_bets: Vec<Bet>,
    #[serde(default)]
    pub last_result: Option<SpinResult>,
    #[serde(default)]
    pub history: Vec<u8>,
    #[serde(default)]
    pub betting_end_time: Option<u64>,
}

impl GameState {
    pub fn new() -> Self {
        Self::default()
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct InstantiationArgument {
    pub host_chain_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    RegisterPlayer { player_id: String, name: String, initial_balance: u64 },
    PlaceBet { player_id: String, bet_type: BetType, numbers: Vec<u8>, amount: u64 },
    StartRound,
    SpinWheel,
    SettleBets { result: u8 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RouletteEvent {
    PlayerRegistered { player: Player, timestamp: String },
    BetPlaced { bet: Bet, timestamp: String },
    WheelSpun { result: SpinResult, timestamp: String },
    BetsSettled { timestamp: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    RegisterPlayerRequest { name: String, initial_balance: u64 },
    PlayerRegisteredConfirm { player: Player, success: bool, error_message: Option<String> },
    PlaceBetRequest { bet_type: BetType, numbers: Vec<u8>, amount: u64, player_name: String },
    BetPlacedConfirm { bet: Bet, success: bool, new_balance: u64, error_message: Option<String> },
    SpinResultBroadcast { result: SpinResult, player_payout: u64, new_balance: u64, won: bool },
    BalanceUpdate { new_balance: u64, reason: String },
    SpinWheelRequest { player_chain_id: String },
}

impl BetType {
    pub fn payout_multiplier(&self) -> u64 {
        match self {
            BetType::Straight => 35,
            BetType::Red | BetType::Black => 1,
            BetType::Even | BetType::Odd => 1,
            BetType::Low | BetType::High => 1,
            BetType::FirstDozen | BetType::SecondDozen | BetType::ThirdDozen => 2,
            BetType::FirstColumn | BetType::SecondColumn | BetType::ThirdColumn => 2,
        }
    }

    pub fn is_winner(&self, number: u8, bet_numbers: &[u8]) -> bool {
        match self {
            BetType::Straight => bet_numbers.contains(&number),
            BetType::Red => is_red(number),
            BetType::Black => is_black(number),
            BetType::Even => number != 0 && number % 2 == 0,
            BetType::Odd => number != 0 && number % 2 == 1,
            BetType::Low => (1..=18).contains(&number),
            BetType::High => (19..=36).contains(&number),
            BetType::FirstDozen => (1..=12).contains(&number),
            BetType::SecondDozen => (13..=24).contains(&number),
            BetType::ThirdDozen => (25..=36).contains(&number),
            BetType::FirstColumn => number != 0 && (number - 1) % 3 == 0,
            BetType::SecondColumn => number != 0 && (number - 2) % 3 == 0,
            BetType::ThirdColumn => number != 0 && number % 3 == 0,
        }
    }
}

pub fn is_red(number: u8) -> bool {
    matches!(number, 1 | 3 | 5 | 7 | 9 | 12 | 14 | 16 | 18 | 19 | 21 | 23 | 25 | 27 | 30 | 32 | 34 | 36)
}

pub fn is_black(number: u8) -> bool {
    number != 0 && !is_red(number)
}

pub fn get_color(number: u8) -> String {
    if number == 0 { "green".to_string() }
    else if is_red(number) { "red".to_string() }
    else { "black".to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== PAYOUT TESTS (10 tests) ====================

    #[test]
    fn test_straight_payout() {
        assert_eq!(BetType::Straight.payout_multiplier(), 35);
    }

    #[test]
    fn test_red_payout() {
        assert_eq!(BetType::Red.payout_multiplier(), 1);
    }

    #[test]
    fn test_black_payout() {
        assert_eq!(BetType::Black.payout_multiplier(), 1);
    }

    #[test]
    fn test_even_payout() {
        assert_eq!(BetType::Even.payout_multiplier(), 1);
    }

    #[test]
    fn test_odd_payout() {
        assert_eq!(BetType::Odd.payout_multiplier(), 1);
    }

    #[test]
    fn test_low_payout() {
        assert_eq!(BetType::Low.payout_multiplier(), 1);
    }

    #[test]
    fn test_high_payout() {
        assert_eq!(BetType::High.payout_multiplier(), 1);
    }

    #[test]
    fn test_dozen_payouts() {
        assert_eq!(BetType::FirstDozen.payout_multiplier(), 2);
        assert_eq!(BetType::SecondDozen.payout_multiplier(), 2);
        assert_eq!(BetType::ThirdDozen.payout_multiplier(), 2);
    }

    #[test]
    fn test_column_payouts() {
        assert_eq!(BetType::FirstColumn.payout_multiplier(), 2);
        assert_eq!(BetType::SecondColumn.payout_multiplier(), 2);
        assert_eq!(BetType::ThirdColumn.payout_multiplier(), 2);
    }

    #[test]
    fn test_payout_calculation() {
        let bet_amount: u64 = 100;
        assert_eq!(bet_amount + bet_amount * BetType::Straight.payout_multiplier(), 3600);
        assert_eq!(bet_amount + bet_amount * BetType::Red.payout_multiplier(), 200);
        assert_eq!(bet_amount + bet_amount * BetType::FirstDozen.payout_multiplier(), 300);
    }

    // ==================== COLOR TESTS (6 tests) ====================

    #[test]
    fn test_zero_is_green() {
        assert_eq!(get_color(0), "green");
        assert!(!is_red(0));
        assert!(!is_black(0));
    }

    #[test]
    fn test_red_numbers() {
        let red_numbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        for n in red_numbers {
            assert!(is_red(n), "Number {} should be red", n);
            assert!(!is_black(n), "Number {} should not be black", n);
            assert_eq!(get_color(n), "red");
        }
    }

    #[test]
    fn test_black_numbers() {
        let black_numbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
        for n in black_numbers {
            assert!(is_black(n), "Number {} should be black", n);
            assert!(!is_red(n), "Number {} should not be red", n);
            assert_eq!(get_color(n), "black");
        }
    }

    #[test]
    fn test_all_numbers_have_color() {
        for n in 0..=36 {
            let color = get_color(n);
            assert!(color == "green" || color == "red" || color == "black");
        }
    }

    #[test]
    fn test_color_count() {
        let red_count = (1..=36).filter(|&n| is_red(n)).count();
        let black_count = (1..=36).filter(|&n| is_black(n)).count();
        assert_eq!(red_count, 18);
        assert_eq!(black_count, 18);
    }

    #[test]
    fn test_zero_not_red_not_black() {
        assert!(!is_red(0));
        assert!(!is_black(0));
    }

    // ==================== STRAIGHT BET TESTS (4 tests) ====================

    #[test]
    fn test_straight_bet_wins_exact() {
        assert!(BetType::Straight.is_winner(17, &[17]));
        assert!(BetType::Straight.is_winner(0, &[0]));
        assert!(BetType::Straight.is_winner(36, &[36]));
    }

    #[test]
    fn test_straight_bet_loses_different() {
        assert!(!BetType::Straight.is_winner(17, &[18]));
        assert!(!BetType::Straight.is_winner(0, &[1]));
        assert!(!BetType::Straight.is_winner(5, &[10, 15, 20]));
    }

    #[test]
    fn test_straight_bet_multiple_numbers() {
        assert!(BetType::Straight.is_winner(5, &[1, 5, 10]));
        assert!(!BetType::Straight.is_winner(7, &[1, 5, 10]));
    }

    #[test]
    fn test_straight_bet_empty_numbers() {
        assert!(!BetType::Straight.is_winner(17, &[]));
    }

    // ==================== RED/BLACK BET TESTS (4 tests) ====================

    #[test]
    fn test_red_bet_wins() {
        assert!(BetType::Red.is_winner(1, &[]));
        assert!(BetType::Red.is_winner(19, &[]));
        assert!(BetType::Red.is_winner(36, &[]));
    }

    #[test]
    fn test_red_bet_loses() {
        assert!(!BetType::Red.is_winner(0, &[]));
        assert!(!BetType::Red.is_winner(2, &[]));
        assert!(!BetType::Red.is_winner(17, &[]));
    }

    #[test]
    fn test_black_bet_wins() {
        assert!(BetType::Black.is_winner(2, &[]));
        assert!(BetType::Black.is_winner(17, &[]));
        assert!(BetType::Black.is_winner(35, &[]));
    }

    #[test]
    fn test_black_bet_loses() {
        assert!(!BetType::Black.is_winner(0, &[]));
        assert!(!BetType::Black.is_winner(1, &[]));
        assert!(!BetType::Black.is_winner(36, &[]));
    }

    // ==================== EVEN/ODD BET TESTS (4 tests) ====================

    #[test]
    fn test_even_bet_wins() {
        assert!(BetType::Even.is_winner(2, &[]));
        assert!(BetType::Even.is_winner(18, &[]));
        assert!(BetType::Even.is_winner(36, &[]));
    }

    #[test]
    fn test_even_bet_loses_on_odd() {
        assert!(!BetType::Even.is_winner(1, &[]));
        assert!(!BetType::Even.is_winner(17, &[]));
        assert!(!BetType::Even.is_winner(35, &[]));
    }

    #[test]
    fn test_odd_bet_wins() {
        assert!(BetType::Odd.is_winner(1, &[]));
        assert!(BetType::Odd.is_winner(17, &[]));
        assert!(BetType::Odd.is_winner(35, &[]));
    }

    #[test]
    fn test_even_odd_zero_loses() {
        assert!(!BetType::Even.is_winner(0, &[]));
        assert!(!BetType::Odd.is_winner(0, &[]));
    }

    // ==================== LOW/HIGH BET TESTS (4 tests) ====================

    #[test]
    fn test_low_bet_wins() {
        assert!(BetType::Low.is_winner(1, &[]));
        assert!(BetType::Low.is_winner(10, &[]));
        assert!(BetType::Low.is_winner(18, &[]));
    }

    #[test]
    fn test_low_bet_loses() {
        assert!(!BetType::Low.is_winner(0, &[]));
        assert!(!BetType::Low.is_winner(19, &[]));
        assert!(!BetType::Low.is_winner(36, &[]));
    }

    #[test]
    fn test_high_bet_wins() {
        assert!(BetType::High.is_winner(19, &[]));
        assert!(BetType::High.is_winner(25, &[]));
        assert!(BetType::High.is_winner(36, &[]));
    }

    #[test]
    fn test_high_bet_loses() {
        assert!(!BetType::High.is_winner(0, &[]));
        assert!(!BetType::High.is_winner(1, &[]));
        assert!(!BetType::High.is_winner(18, &[]));
    }

    // ==================== DOZEN BET TESTS (6 tests) ====================

    #[test]
    fn test_first_dozen_wins() {
        for n in 1..=12 {
            assert!(BetType::FirstDozen.is_winner(n, &[]), "FirstDozen should win on {}", n);
        }
    }

    #[test]
    fn test_first_dozen_loses() {
        assert!(!BetType::FirstDozen.is_winner(0, &[]));
        assert!(!BetType::FirstDozen.is_winner(13, &[]));
        assert!(!BetType::FirstDozen.is_winner(36, &[]));
    }

    #[test]
    fn test_second_dozen_wins() {
        for n in 13..=24 {
            assert!(BetType::SecondDozen.is_winner(n, &[]), "SecondDozen should win on {}", n);
        }
    }

    #[test]
    fn test_second_dozen_loses() {
        assert!(!BetType::SecondDozen.is_winner(0, &[]));
        assert!(!BetType::SecondDozen.is_winner(12, &[]));
        assert!(!BetType::SecondDozen.is_winner(25, &[]));
    }

    #[test]
    fn test_third_dozen_wins() {
        for n in 25..=36 {
            assert!(BetType::ThirdDozen.is_winner(n, &[]), "ThirdDozen should win on {}", n);
        }
    }

    #[test]
    fn test_third_dozen_loses() {
        assert!(!BetType::ThirdDozen.is_winner(0, &[]));
        assert!(!BetType::ThirdDozen.is_winner(24, &[]));
    }

    // ==================== COLUMN BET TESTS (6 tests) ====================

    #[test]
    fn test_first_column_wins() {
        let first_col = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        for n in first_col {
            assert!(BetType::FirstColumn.is_winner(n, &[]), "FirstColumn should win on {}", n);
        }
    }

    #[test]
    fn test_first_column_loses() {
        assert!(!BetType::FirstColumn.is_winner(0, &[]));
        assert!(!BetType::FirstColumn.is_winner(2, &[]));
        assert!(!BetType::FirstColumn.is_winner(3, &[]));
    }

    #[test]
    fn test_second_column_wins() {
        let second_col = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
        for n in second_col {
            assert!(BetType::SecondColumn.is_winner(n, &[]), "SecondColumn should win on {}", n);
        }
    }

    #[test]
    fn test_second_column_loses() {
        assert!(!BetType::SecondColumn.is_winner(0, &[]));
        assert!(!BetType::SecondColumn.is_winner(3, &[]));
        assert!(!BetType::SecondColumn.is_winner(4, &[]));
    }

    #[test]
    fn test_third_column_wins() {
        let third_col = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
        for n in third_col {
            assert!(BetType::ThirdColumn.is_winner(n, &[]), "ThirdColumn should win on {}", n);
        }
    }

    #[test]
    fn test_third_column_loses() {
        assert!(!BetType::ThirdColumn.is_winner(0, &[]));
        assert!(!BetType::ThirdColumn.is_winner(1, &[]));
        assert!(!BetType::ThirdColumn.is_winner(2, &[]));
    }

    // ==================== EDGE CASE TESTS (4 tests) ====================

    #[test]
    fn test_zero_loses_all_outside_bets() {
        assert!(!BetType::Red.is_winner(0, &[]));
        assert!(!BetType::Black.is_winner(0, &[]));
        assert!(!BetType::Even.is_winner(0, &[]));
        assert!(!BetType::Odd.is_winner(0, &[]));
        assert!(!BetType::Low.is_winner(0, &[]));
        assert!(!BetType::High.is_winner(0, &[]));
        assert!(!BetType::FirstDozen.is_winner(0, &[]));
        assert!(!BetType::SecondDozen.is_winner(0, &[]));
        assert!(!BetType::ThirdDozen.is_winner(0, &[]));
        assert!(!BetType::FirstColumn.is_winner(0, &[]));
        assert!(!BetType::SecondColumn.is_winner(0, &[]));
        assert!(!BetType::ThirdColumn.is_winner(0, &[]));
    }

    #[test]
    fn test_zero_wins_straight_bet() {
        assert!(BetType::Straight.is_winner(0, &[0]));
    }

    #[test]
    fn test_boundary_numbers() {
        assert!(BetType::Low.is_winner(1, &[]));
        assert!(BetType::Low.is_winner(18, &[]));
        assert!(!BetType::Low.is_winner(19, &[]));
        assert!(BetType::High.is_winner(19, &[]));
        assert!(BetType::High.is_winner(36, &[]));
        assert!(!BetType::High.is_winner(18, &[]));
    }

    #[test]
    fn test_all_numbers_valid_range() {
        for n in 0..=36 {
            let _ = get_color(n);
            let _ = BetType::Straight.is_winner(n, &[n]);
        }
    }

    // ==================== GAME STATE TESTS (2 tests) ====================

    #[test]
    fn test_game_state_default() {
        let state = GameState::new();
        assert!(!state.is_spinning);
        assert!(state.current_bets.is_empty());
        assert!(state.last_result.is_none());
        assert!(state.history.is_empty());
        assert!(state.betting_end_time.is_none());
    }

    #[test]
    fn test_instantiation_argument_default() {
        let arg = InstantiationArgument::default();
        assert!(arg.host_chain_id.is_none());
    }
}
