use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer},
};

use crate::state::Escrow;

#[derive(Accounts)]
pub struct Take<'info> {
    #[account(mut)]
    pub maker: SystemAccount<'info>,
    /// Why is this needed ?

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = taker_token,
        associated_token::authority = maker
    )]
    pub maker_receive_ata: Account<'info, TokenAccount>, // associated token account for maker account

    pub maker_token: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub taker: Signer<'info>, // signer of the transaction

    #[account(
        mut,
        associated_token::mint = taker_token,
        associated_token::authority = taker
    )]
    pub taker_ata: Account<'info, TokenAccount>, // associated token account for taker account

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = maker_token,
        associated_token::authority = taker
    )]
    pub taker_receive_ata: Account<'info, TokenAccount>,
    /// Why there are two ata accounts for taker ??
    pub taker_token: Box<Account<'info, Mint>>,

    /// CHECK: This is not dangerous because this account doesn't exist
    #[account(
        seeds = [b"auth"],
        bump = escrow.auth_bump
    )]
    pub auth: UncheckedAccount<'info>, // required for the program to sign

    /// Should we close here taker ??
    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump = escrow.vault_bump,
        token::mint = maker_token,
        token::authority = auth
    )]
    pub vault: Account<'info, TokenAccount>, // is a token account that holds token B

    #[account(
        mut,
        has_one = maker,
        has_one = taker_token,
        has_one = maker_token,
        seeds = [b"escrow", maker.key.as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.escrow_bump,
        close = taker
    )]
    pub escrow: Box<Account<'info, Escrow>>, //  holds all the data for a single instance of the escrow program

    pub token_program: Program<'info, Token>, // it has the instructions to handle (move) tokens
    pub associated_token_program: Program<'info, AssociatedToken>, // to initialize the vault account
    pub system_program: Program<'info, System>, // program on chain that can create accounts. Everytime we use "init", se need it
}

impl<'info> Take<'info> {
    pub fn deposit_to_maker(&self) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.taker_ata.to_account_info(),
            to: self.maker_receive_ata.to_account_info(),
            authority: self.taker.to_account_info(),
        };
        let ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);
        transfer(ctx, self.escrow.offer_amount) // This should be change to what ??
    }

    pub fn empty_vault_to_taker(&self) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.vault.to_account_info(),
            to: self.taker_receive_ata.to_account_info(),
            authority: self.auth.to_account_info(),
        };
        let signer_seeds = &[&b"auth"[..], &[self.escrow.auth_bump]];
        let binding = [&signer_seeds[..]];
        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            &binding,
        );
        transfer(ctx, self.vault.amount)
    }

    pub fn close_vault(&self) -> Result<()> {
        let cpi_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.taker.to_account_info(),
            authority: self.auth.to_account_info(),
        };
        let signer_seeds = &[&b"auth"[..], &[self.escrow.auth_bump]];
        let binding = [&signer_seeds[..]];
        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            &binding,
        );
        close_account(ctx)
    }
}
