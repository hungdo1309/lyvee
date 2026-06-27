import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Group } from '../types';
import { Expense, ExpenseGroup, ExpenseSettlement } from '../types/expenses';
import { Trip } from '../types/trips';
import {
  fetchExpenseGroupExpensesOnce,
  fetchExpenseGroupSettlementsOnce,
} from '../services/expenseGroups';
import { filterVisibleExpenseGroups } from '../utils/expensePermissions';

export function useGroupExpenseSettleData(
  group: Group | null,
  userId: string | undefined,
  expenseGroups: ExpenseGroup[],
  trips: Trip[]
): {
  visibleExpenseGroups: ExpenseGroup[];
  expensesByGroupId: Map<string, Expense[]>;
  settlementsByGroupId: Map<string, ExpenseSettlement[]>;
  loading: boolean;
  refreshExpenseSettleData: (expenseGroupId?: string) => void;
} {
  const isFocused = useIsFocused();
  const [expensesByGroupId, setExpensesByGroupId] = useState<Map<string, Expense[]>>(new Map());
  const [settlementsByGroupId, setSettlementsByGroupId] = useState<
    Map<string, ExpenseSettlement[]>
  >(new Map());
  const [loadedGroupIds, setLoadedGroupIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshExpenseSettleData = useCallback((expenseGroupId?: string) => {
    if (expenseGroupId) {
      void Promise.all([
        fetchExpenseGroupExpensesOnce(expenseGroupId),
        fetchExpenseGroupSettlementsOnce(expenseGroupId),
      ])
        .then(([expenses, settlements]) => {
          setExpensesByGroupId((current) => {
            const next = new Map(current);
            next.set(expenseGroupId, expenses);
            return next;
          });
          setSettlementsByGroupId((current) => {
            const next = new Map(current);
            next.set(expenseGroupId, settlements);
            return next;
          });
        })
        .catch((error) => {
          console.warn('[useGroupExpenseSettleData] refresh group:', error);
        });
      return;
    }

    setRefreshKey((value) => value + 1);
  }, []);

  const visibleExpenseGroupIdsKey = useMemo(() => {
    if (!group || !userId) return '';
    return filterVisibleExpenseGroups(expenseGroups, group, userId, trips)
      .map((entry) => entry.id)
      .sort()
      .join(',');
  }, [group, userId, expenseGroups, trips]);

  const visibleExpenseGroups = useMemo(() => {
    if (!group || !userId || visibleExpenseGroupIdsKey === '') return [];
    const visibleIds = new Set(visibleExpenseGroupIdsKey.split(','));
    return expenseGroups.filter((entry) => visibleIds.has(entry.id));
  }, [visibleExpenseGroupIdsKey, expenseGroups, group, userId]);

  useEffect(() => {
    if (!isFocused || visibleExpenseGroupIdsKey === '') {
      setExpensesByGroupId((current) => (current.size === 0 ? current : new Map()));
      setSettlementsByGroupId((current) => (current.size === 0 ? current : new Map()));
      setLoadedGroupIds((current) => (current.size === 0 ? current : new Set()));
      return;
    }

    const expenseGroupIds = visibleExpenseGroupIdsKey.split(',');
    let cancelled = false;
    setLoadedGroupIds(new Set());

    void Promise.all(
      expenseGroupIds.map(async (expenseGroupId) => {
        const [expenses, settlements] = await Promise.all([
          fetchExpenseGroupExpensesOnce(expenseGroupId),
          fetchExpenseGroupSettlementsOnce(expenseGroupId),
        ]);
        return { expenseGroupId, expenses, settlements };
      })
    )
      .then((results) => {
        if (cancelled) return;

        const nextExpenses = new Map<string, Expense[]>();
        const nextSettlements = new Map<string, ExpenseSettlement[]>();
        const nextLoaded = new Set<string>();

        for (const result of results) {
          nextExpenses.set(result.expenseGroupId, result.expenses);
          nextSettlements.set(result.expenseGroupId, result.settlements);
          nextLoaded.add(result.expenseGroupId);
        }

        setExpensesByGroupId(nextExpenses);
        setSettlementsByGroupId(nextSettlements);
        setLoadedGroupIds(nextLoaded);
      })
      .catch((error) => {
        console.warn('[useGroupExpenseSettleData] fetch:', error);
        if (!cancelled) {
          setExpensesByGroupId(new Map());
          setSettlementsByGroupId(new Map());
          setLoadedGroupIds(new Set());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isFocused, visibleExpenseGroupIdsKey, refreshKey]);

  const visibleExpenseGroupCount = visibleExpenseGroupIdsKey
    ? visibleExpenseGroupIdsKey.split(',').length
    : 0;

  const loading =
    visibleExpenseGroupCount > 0 && loadedGroupIds.size < visibleExpenseGroupCount;

  return {
    visibleExpenseGroups,
    expensesByGroupId,
    settlementsByGroupId,
    loading,
    refreshExpenseSettleData,
  };
}
