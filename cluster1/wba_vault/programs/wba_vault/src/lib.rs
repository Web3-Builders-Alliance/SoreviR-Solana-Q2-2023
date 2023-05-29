use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, Transfer as SPLTransfer},
};

declare_id!("EK5MYUPp2y8KnnhCWBNMGYYkCK1k8sib4WgkWkzE6FD5");

//---------------------------------------------- Instruction Handlers ---------------------------------------------------
#[program]
pub mod wba_vault {
    use super::*;
    use anchor_lang::system_program;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.vault_state.owner = *ctx.accounts.owner.key;
        ctx.accounts.vault_state.auth_bump = *ctx.bumps.get("vault_auth").unwrap();
        ctx.accounts.vault_state.vault_bump = *ctx.bumps.get("vault").unwrap();
        ctx.accounts.vault_state.score = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let cpi = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );

        system_program::transfer(cpi, amount)?;
        ctx.accounts.vault_state.score += 1;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let seeds = &[
            "vault".as_bytes(),
            &ctx.accounts.vault_auth.key().clone().to_bytes(),
            &[ctx.accounts.vault_state.vault_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_program = ctx.accounts.system_program.to_account_info();

        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        };

        let cpi = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        system_program::transfer(cpi, amount)?;

        ctx.accounts.vault_state.score += 1;
        Ok(())
    }

    pub fn deposit_spl(ctx: Context<DepositSpl>, amount: u64) -> Result<()> {
        let cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            SPLTransfer {
                from: ctx.accounts.owner_ata.to_account_info(),
                to: ctx.accounts.vault_ata.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );

        anchor_spl::token::transfer(cpi, amount)?;
        ctx.accounts.vault_state.score += 1;
        Ok(())
    }

    pub fn withdraw_spl(ctx: Context<WithdrawSpl>, amount: u64) -> Result<()> {
        let authority = ctx.accounts.vault_auth.to_account_info();
        let from = ctx.accounts.vault_ata.to_account_info();
        let to = ctx.accounts.owner_ata.to_account_info();
        let token_program = ctx.accounts.token_program.to_account_info();
        let vault_state = &mut ctx.accounts.vault_state;

        let seeds = &[
            "auth".as_bytes(),
            vault_state.to_account_info().key.as_ref(),
            &[vault_state.auth_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = SPLTransfer {
            from,
            to,
            authority,
        };

        let cpi = CpiContext::new_with_signer(token_program, cpi_accounts, signer_seeds);

        anchor_spl::token::transfer(cpi, amount)?;

        vault_state.score += 1;
        Ok(())
    }
}

//------------------------------------------------ Instruction Context -----------------------------------------------
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    // the space could be if we use impl: space=Vault::LEN
    #[account(init, payer = owner, space = 8 + 32 + 3)]
    pub vault_state: Account<'info, VaultState>,

    #[account(seeds = [b"auth", vault_state.key().as_ref()], bump)]
    ///CHECK: no need to check this
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"vault", vault_auth.key().as_ref()], bump)]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner)]
    pub vault_state: Account<'info, VaultState>,

    #[account(seeds = [b"auth", vault_state.key().as_ref()], bump = vault_state.auth_bump)]
    ///CHECK: no need to check this
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"vault", vault_auth.key().as_ref()], bump = vault_state.vault_bump)]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner)]
    pub vault_state: Account<'info, VaultState>,

    #[account(seeds = [b"auth", vault_state.key().as_ref()], bump = vault_state.auth_bump)]
    ///CHECK: no need to check this
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"vault", vault_auth.key().as_ref()], bump = vault_state.vault_bump)]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositSpl<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, associated_token::mint = token_mint, associated_token::authority = owner)]
    pub owner_ata: Account<'info, TokenAccount>,

    #[account(mut, has_one = owner)]
    pub vault_state: Account<'info, VaultState>,

    #[account(seeds = [b"auth", vault_state.key().as_ref()], bump = vault_state.auth_bump)]
    ///CHECK: no need to check this
    pub vault_auth: UncheckedAccount<'info>,

    #[account(init_if_needed, payer = owner, associated_token::mint = token_mint, associated_token::authority = vault_auth)]
    pub vault_ata: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct WithdrawSpl<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, associated_token::mint = token_mint, associated_token::authority = owner)]
    pub owner_ata: Account<'info, TokenAccount>,

    #[account(mut, has_one = owner)]
    pub vault_state: Account<'info, VaultState>,

    #[account(seeds = [b"auth", vault_state.key().as_ref()], bump = vault_state.auth_bump)]
    ///CHECK: no need to check this
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = token_mint, associated_token::authority = vault_auth)]
    pub vault_ata: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

//-------------------------------------------------- Account State -------------------------------------------------------
#[account]
pub struct VaultState {
    owner: Pubkey,  // 32
    auth_bump: u8,  // 1
    vault_bump: u8, // 1
    score: u8,      // 1
}

// impl Vault {
//     const LEN: usize =8 + 32 + 1 + 1 + 1;
// }
