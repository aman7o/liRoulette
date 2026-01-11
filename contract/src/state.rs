// SPDX-License-Identifier: Apache-2.0

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, SetView, ViewStorageContext};
use linera_roulette::{GameState, Player};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct RouletteState {
    pub game: RegisterView<GameState>,
    pub players: MapView<String, Player>,
    pub is_host: RegisterView<bool>,
    pub host_chain_id: RegisterView<Option<String>>,
    pub my_player: RegisterView<Option<Player>>,
    pub player_chains: SetView<String>,
}
