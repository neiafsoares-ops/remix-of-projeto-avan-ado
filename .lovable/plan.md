
## Plan: Default Configurations for All Products ✅ COMPLETED

### Summary
This plan implements two default configuration behaviors across all products (Pools, Quiz 10, and Torcida Mestre):
1. **Default 20% administrative fee** - All creation forms will start with 20% instead of 0%
2. **Auto-fill prediction deadline** - When a match date is configured, the deadline automatically sets to 1 minute before

---

### Changes Completed

#### 1. Default 20% Administrative Fee ✅

| File | Change Applied |
|------|----------------|
| `src/components/torcida-mestre/CreateTorcidaMestreDialog.tsx` | `admin_fee_percent: 20` |
| `src/components/admin/CreateQuizDialog.tsx` | `admin_fee_percent: 20` |
| `src/components/pools/CreatePoolWizard.tsx` | `adminFeePercent: 20` |

#### 2. Auto-fill Deadline (1 minute before match) ✅

| File | Change Applied |
|------|----------------|
| `src/pages/TorcidaMestreManage.tsx` | Auto-fills deadline when match_date changes |
| `src/components/matches/AddGamesScreen.tsx` | Auto-fills deadline in `updateSlot`, `updateGroupSlot`, and `applyDefaultsToAll` |

---

### User Experience
- Forms display 20% as the initial value for administrative fee
- When configuring a match date, the deadline field automatically populates with the time 1 minute before
- Both fields remain editable - the user can adjust as needed
