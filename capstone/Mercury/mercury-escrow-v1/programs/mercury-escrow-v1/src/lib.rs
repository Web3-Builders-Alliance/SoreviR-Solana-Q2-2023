use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

mod constants;
mod contexts;
mod errors;
mod state;

use contexts::*;

#[program]
pub mod mercury_escrow_v1 {
    use super::*;

    pub fn make(ctx: Context<Make>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
