import { supabase } from './supabase'
import type {
  Buyin,
  DealerShift,
  InsuranceLog,
  InsuranceType,
  Member,
  PlayerCard,
  PlayerRecord,
  RakeMode,
  Session,
  SessionStats,
} from './types'

/* ------------------------------ Members ------------------------------ */

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createMember(name: string, wechat = ''): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ name, wechat: wechat || null })
    .select()
    .single()
  if (error) throw error
  return data as Member
}

/* ------------------------------ Sessions ----------------------------- */

export async function listSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('start_time', { ascending: false })
  if (error) throw error
  return (data ?? []) as Session[]
}

export async function getActiveSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('status', 'active')
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as Session) ?? null
}

export async function createSession(input: {
  title: string
  rake_mode: RakeMode
  rake_rate: number
}): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      title: input.title,
      rake_mode: input.rake_mode,
      rake_rate: input.rake_rate,
      status: 'active',
    })
    .select()
    .single()
  if (error) throw error
  return data as Session
}

export async function endSession(sessionId: string, boxTotal?: number): Promise<void> {
  const patch: Record<string, unknown> = {
    status: 'ended',
    end_time: new Date().toISOString(),
  }
  if (typeof boxTotal === 'number') patch.box_total_chips = boxTotal
  const { error } = await supabase.from('sessions').update(patch).eq('id', sessionId)
  if (error) throw error
}

export async function updateSessionBoxTotal(sessionId: string, boxTotal: number): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ box_total_chips: boxTotal })
    .eq('id', sessionId)
  if (error) throw error
}

/* --------------------------- Player records -------------------------- */

export async function joinSession(sessionId: string, memberId: string): Promise<PlayerRecord> {
  const { data, error } = await supabase
    .from('player_records')
    .upsert(
      { session_id: sessionId, member_id: memberId },
      { onConflict: 'session_id,member_id', ignoreDuplicates: false },
    )
    .select()
    .single()
  if (error) throw error
  return data as PlayerRecord
}

export async function addBuyin(playerRecordId: string, amount: number): Promise<Buyin> {
  const { data, error } = await supabase
    .from('buyins')
    .insert({ player_record_id: playerRecordId, amount })
    .select()
    .single()
  if (error) throw error
  return data as Buyin
}

export async function deleteBuyin(buyinId: string): Promise<void> {
  const { error } = await supabase.from('buyins').delete().eq('id', buyinId)
  if (error) throw error
}

export async function settlePlayer(recordId: string, cashout: number): Promise<void> {
  const { error } = await supabase
    .from('player_records')
    .update({ cashout_amount: cashout, is_settled: true })
    .eq('id', recordId)
  if (error) throw error
}

export async function unsettlePlayer(recordId: string): Promise<void> {
  const { error } = await supabase
    .from('player_records')
    .update({ cashout_amount: 0, is_settled: false })
    .eq('id', recordId)
  if (error) throw error
}

/* ------------------------------ Insurance ---------------------------- */

export async function listInsuranceLogs(sessionId: string): Promise<InsuranceLog[]> {
  const { data, error } = await supabase
    .from('insurance_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: false })
  if (error) throw error
  return (data ?? []) as InsuranceLog[]
}

export async function addInsuranceLog(input: {
  session_id: string
  type: InsuranceType
  amount: number
  remark?: string
}): Promise<InsuranceLog> {
  const { data, error } = await supabase
    .from('insurance_logs')
    .insert({ ...input, remark: input.remark || null })
    .select()
    .single()
  if (error) throw error
  return data as InsuranceLog
}

export async function deleteInsuranceLog(id: string): Promise<void> {
  const { error } = await supabase.from('insurance_logs').delete().eq('id', id)
  if (error) throw error
}

/* ---------------------------- Dealer shifts -------------------------- */

export async function listDealerShifts(sessionId: string): Promise<DealerShift[]> {
  const { data, error } = await supabase
    .from('dealer_shifts')
    .select('*')
    .eq('session_id', sessionId)
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as DealerShift[]
}

export async function addDealerShift(input: {
  session_id: string
  dealer_name: string
  rake_chips: number
  tip_chips: number
  start_time?: string
  end_time?: string
}): Promise<DealerShift> {
  const { data, error } = await supabase
    .from('dealer_shifts')
    .insert({
      session_id: input.session_id,
      dealer_name: input.dealer_name,
      rake_chips: input.rake_chips,
      tip_chips: input.tip_chips,
      start_time: input.start_time ?? new Date().toISOString(),
      end_time: input.end_time ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data as DealerShift
}

export async function deleteDealerShift(id: string): Promise<void> {
  const { error } = await supabase.from('dealer_shifts').delete().eq('id', id)
  if (error) throw error
}

/* ---------------------------- Aggregation ---------------------------- */

export interface SessionBundle {
  session: Session | null
  sessions: Session[]
  members: Member[]
  players: PlayerCard[]
  buyins: Buyin[]
  insuranceLogs: InsuranceLog[]
  dealerShifts: DealerShift[]
  stats: SessionStats
}

function emptyStats(): SessionStats {
  return {
    totalBuyins: 0,
    totalCashout: 0,
    totalRake: 0,
    insuranceNet: 0,
    unsettledCount: 0,
    playerCount: 0,
    unaccountedDelta: 0,
  }
}

export function computeTotalRake(
  session: Session | null,
  players: { rake: number }[],
  dealerShifts: DealerShift[],
): number {
  if (!session) return 0
  switch (session.rake_mode) {
    case 'dealer_shift':
      return dealerShifts.reduce((s, d) => s + Number(d.rake_chips ?? 0), 0)
    case 'box_count':
      return Number(session.box_total_chips ?? 0)
    case 'profit_percentage':
      return players.reduce((s, p) => s + p.rake, 0)
    default:
      return 0
  }
}

export async function loadBundle(sessionId: string | null): Promise<SessionBundle> {
  const sessions = await listSessions()
  const members = await listMembers()
  const session =
    (sessionId ? sessions.find((s) => s.id === sessionId) : null) ??
    sessions.find((s) => s.status === 'active') ??
    sessions[0] ??
    null

  if (!session) {
    return {
      session: null,
      sessions,
      members,
      players: [],
      buyins: [],
      insuranceLogs: [],
      dealerShifts: [],
      stats: emptyStats(),
    }
  }

  const [recordsRes, buyinsRes, insRes, shiftsRes] = await Promise.all([
    supabase.from('player_records').select('*').eq('session_id', session.id),
    supabase.from('buyins').select('*'),
    listInsuranceLogs(session.id),
    listDealerShifts(session.id),
  ])
  if (recordsRes.error) throw recordsRes.error
  if (buyinsRes.error) throw buyinsRes.error

  const records = (recordsRes.data ?? []) as PlayerRecord[]
  const recordIds = new Set(records.map((r) => r.id))
  const buyins = ((buyinsRes.data ?? []) as Buyin[]).filter((b) =>
    recordIds.has(b.player_record_id),
  )

  const buyinSum = new Map<string, number>()
  for (const b of buyins) {
    buyinSum.set(b.player_record_id, (buyinSum.get(b.player_record_id) ?? 0) + Number(b.amount))
  }

  const memberMap = new Map(members.map((m) => [m.id, m]))

  const players: PlayerCard[] = records
    .map((record) => {
      const member = memberMap.get(record.member_id)!
      const totalBuyins = buyinSum.get(record.id) ?? 0
      const cashoutAmount = Number(record.cashout_amount ?? 0)
      const profit = Math.max(0, cashoutAmount - totalBuyins)
      const rake =
        session.rake_mode === 'profit_percentage' && record.is_settled
          ? profit * Number(session.rake_rate ?? 0)
          : 0
      return {
        record,
        member,
        totalBuyins,
        cashoutAmount,
        rake,
        netPnl: cashoutAmount - totalBuyins - rake,
      }
    })
    .filter((p) => !!p.member)
    .sort((a, b) => b.netPnl - a.netPnl)

  const totalBuyins = players.reduce((s, p) => s + p.totalBuyins, 0)
  const totalCashout = players
    .filter((p) => p.record.is_settled)
    .reduce((s, p) => s + p.cashoutAmount, 0)
  const totalRake = computeTotalRake(session, players, shiftsRes)
  const insuranceIn = insRes.filter((i) => i.type === 'in').reduce((s, i) => s + Number(i.amount), 0)
  const insuranceOut = insRes.filter((i) => i.type === 'out').reduce((s, i) => s + Number(i.amount), 0)
  const insuranceNet = insuranceIn - insuranceOut
  const unsettledCount = players.filter((p) => !p.record.is_settled).length

  const stats: SessionStats = {
    totalBuyins,
    totalCashout,
    totalRake,
    insuranceNet,
    unsettledCount,
    playerCount: players.length,
    unaccountedDelta: totalBuyins - totalCashout - totalRake - insuranceNet,
  }

  return {
    session,
    sessions,
    members,
    players,
    buyins: [...buyins].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    insuranceLogs: insRes,
    dealerShifts: shiftsRes,
    stats,
  }
}