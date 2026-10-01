export type RakeMode = 'dealer_shift' | 'box_count' | 'profit_percentage'
export type SessionStatus = 'active' | 'ended'
export type InsuranceType = 'in' | 'out'

export interface Member {
  id: string
  name: string
  wechat: string | null
  created_at: string
}

export interface Session {
  id: string
  title: string
  rake_mode: RakeMode
  rake_rate: number
  box_total_chips: number
  status: SessionStatus
  start_time: string
  end_time: string | null
}

export interface PlayerRecord {
  id: string
  session_id: string
  member_id: string
  cashout_amount: number
  is_settled: boolean
}

export interface Buyin {
  id: string
  player_record_id: string
  amount: number
  timestamp: string
}

export interface InsuranceLog {
  id: string
  session_id: string
  type: InsuranceType
  amount: number
  remark: string | null
  timestamp: string
}

export interface DealerShift {
  id: string
  session_id: string
  dealer_name: string
  rake_chips: number
  tip_chips: number
  start_time: string
  end_time: string | null
}

/** 玩家卡片聚合数据 */
export interface PlayerCard {
  record: PlayerRecord
  member: Member
  totalBuyins: number
  cashoutAmount: number
  rake: number
  netPnl: number
}

export interface SessionStats {
  totalBuyins: number
  totalCashout: number
  totalRake: number
  insuranceNet: number
  unsettledCount: number
  playerCount: number
  unaccountedDelta: number
}

export const RAKE_MODE_LABELS: Record<RakeMode, string> = {
  dealer_shift: '模式1 · 荷官按小时抽水',
  box_count: '模式2 · 水箱计数（结束时录入）',
  profit_percentage: '模式3 · 盈利百分比（离场自动扣）',
}