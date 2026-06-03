# README-SUBMISSION

## Candidate Information
- Name: Isenewo Oluwaseyi Ephraim
- Email: isenewoephr2012@gmail.com

## Repository
- GitHub URL: https://github.com/Oluwaseyi89/smart-contract-engineer-role.git

## Contract Address (Localhost)
- QuestEscrow: 0x5FbDB2315678afecb367f032d93F642f64180aa3
- Mock USDC: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
- Chain ID: 31337
- RPC URL: http://127.0.0.1:8545

## What Was Implemented
- Completed `contracts/contracts/QuestEscrow.sol` to satisfy all assessment scenarios A-I.
- Implemented `lib/hooks/useQuestEscrow.ts` with `useWriteContract` and `useWaitForTransactionReceipt` for:
  - `useCreateQuest`
  - `useQuestActions` (`accept`, `submit`, `approve`, `claimTimeout`, `cancel`, `refund`)
- Wired UI flow for create/accept/submit/approve in:
  - `app/quests/create/page.tsx`
  - `app/quests/[id]/page.tsx`

## How To Run
1. Install dependencies:
   - `npm install`
   - `npm install --prefix contracts`
2. Start local chain:
   - `npm run contracts:node`
3. Deploy contracts:
   - `npm run contracts:deploy`
4. Set env values in `.env` or `.env.local` (repo root):
   - `NEXT_PUBLIC_QUEST_ESCROW_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - `NEXT_PUBLIC_MOCK_USDC_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
   - `NEXT_PUBLIC_CHAIN_ID=31337`
   - `NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`
5. Run UI:
   - `npm run dev`
6. Run tests:
   - `npm test`

## UI Checklist Status
- Wallet connected in header: done
- Create quest on `/quests/create`: done
- Quest appears on `/quests` (Open): done
- Worker accepts on `/quests/[id]`: done
- Worker submits deliverable: done
- Poster approves and pays: done
- Worker receives ~97% payout: done

## Screenshots
Screenshots are included in `assets/`.

Primary references:
- `assets/Screenshot from 2026-06-03 14-01-59.png`
- `assets/Screenshot from 2026-06-03 14-02-18.png`
- `assets/Screenshot from 2026-06-03 14-02-23.png`
- `assets/Screenshot from 2026-06-03 14-04-12.png`
