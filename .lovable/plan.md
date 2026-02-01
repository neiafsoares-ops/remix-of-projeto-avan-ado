
## Plan: Default Configurations for All Products

### Summary
This plan implements two default configuration behaviors across all products (Pools, Quiz 10, and Torcida Mestre):
1. **Default 20% administrative fee** - All creation forms will start with 20% instead of 0%
2. **Auto-fill prediction deadline** - When a match date is configured, the deadline automatically sets to 1 minute before

---

### Changes Required

#### 1. Default 20% Administrative Fee

**Files to update:**

| File | Current Default | Change |
|------|-----------------|--------|
| `src/components/torcida-mestre/CreateTorcidaMestreDialog.tsx` | `admin_fee_percent: 0` | `admin_fee_percent: 20` |
| `src/components/admin/CreateQuizDialog.tsx` | `admin_fee_percent: 0` | `admin_fee_percent: 20` |
| `src/components/pools/CreatePoolWizard.tsx` | `adminFeePercent: 0` (line 97) | `adminFeePercent: 20` |

The user can still edit the value (increase or decrease), but the form starts at 20%.

---

#### 2. Auto-fill Deadline (1 minute before match)

**Torcida Mestre** (`src/pages/TorcidaMestreManage.tsx`):
- When `match_date` changes, automatically calculate and set `prediction_deadline` to 1 minute before
- The user can still manually adjust the deadline after auto-fill

**Pools/Matches** (`src/components/matches/AddGamesScreen.tsx`):
- When `match_date` is entered in a slot, auto-fill `prediction_deadline` to 1 minute before
- Also apply this logic to the "default date/time" feature that applies to all slots

**Quiz 10** (`src/pages/QuizManage.tsx`):
- Quiz rounds do not have match dates, only a single deadline
- **No change required** for this product

---

### Technical Details

#### Auto-fill Logic (JavaScript/TypeScript)
```typescript
// When match_date changes, calculate deadline 1 minute before
const handleMatchDateChange = (matchDate: string) => {
  setNewRound({ ...newRound, match_date: matchDate });
  
  // Auto-fill deadline to 1 minute before match
  if (matchDate) {
    const matchTime = new Date(matchDate);
    matchTime.setMinutes(matchTime.getMinutes() - 1);
    const deadlineValue = matchTime.toISOString().slice(0, 16); // Format for datetime-local
    setNewRound(prev => ({ ...prev, prediction_deadline: deadlineValue }));
  }
};
```

---

### Summary Table

| Product | 20% Default Fee | Auto-deadline |
|---------|-----------------|---------------|
| Torcida Mestre | Yes - CreateTorcidaMestreDialog.tsx | Yes - TorcidaMestreManage.tsx |
| Pools/Matches | Yes - CreatePoolWizard.tsx | Yes - AddGamesScreen.tsx |
| Quiz 10 | Yes - CreateQuizDialog.tsx | N/A (no match dates) |

---

### User Experience
- Forms will display 20% as the initial value for administrative fee
- When configuring a match date, the deadline field automatically populates with the time 1 minute before
- Both fields remain editable - the user can adjust as needed
