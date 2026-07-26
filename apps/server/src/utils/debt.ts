export type MemberBalance = {
  userId: string;
  name: string;
  balance: number;
};

export type SimplifiedDebt = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: string;
};

export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  const debtors = balances
    .filter((item) => item.balance < -0.009)
    .map((item) => ({ ...item, remaining: Math.round(-item.balance * 100) }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = balances
    .filter((item) => item.balance > 0.009)
    .map((item) => ({ ...item, remaining: Math.round(item.balance * 100) }))
    .sort((a, b) => b.remaining - a.remaining);
  const result: SimplifiedDebt[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(debtor.remaining, creditor.remaining);
    if (cents > 0) {
      result.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: (cents / 100).toFixed(2)
      });
    }
    debtor.remaining -= cents;
    creditor.remaining -= cents;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return result;
}
