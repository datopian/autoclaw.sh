export type TelegramPairingRecord = {
  id: string;
  tenantId: string | null;
  telegramUserId: string;
  telegramChatId: string;
  pairingCode: string;
  status: "pending" | "paired" | "expired";
  issuedAt: string;
  expiresAt: string;
  pairedAt: string | null;
};

type TelegramPairingRow = {
  id: string;
  tenant_id: string | null;
  telegram_user_id: string;
  telegram_chat_id: string;
  pairing_code: string;
  status: "pending" | "paired" | "expired";
  issued_at: string;
  expires_at: string;
  paired_at: string | null;
};

function toRecord(row: TelegramPairingRow): TelegramPairingRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    telegramUserId: row.telegram_user_id,
    telegramChatId: row.telegram_chat_id,
    pairingCode: row.pairing_code,
    status: row.status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    pairedAt: row.paired_at
  };
}

export function createTelegramPairingRepository(db: D1Database) {
  return {
    async createPending(input: {
      telegramUserId: string;
      telegramChatId: string;
      pairingCode: string;
      expiresAt: string;
    }): Promise<TelegramPairingRecord> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT INTO telegram_pairings (id, tenant_id, telegram_user_id, telegram_chat_id, pairing_code, status, issued_at, expires_at, paired_at) VALUES (?1, NULL, ?2, ?3, ?4, 'pending', ?5, ?6, NULL)"
        )
        .bind(
          id,
          input.telegramUserId,
          input.telegramChatId,
          input.pairingCode,
          now,
          input.expiresAt
        )
        .run();

      return {
        id,
        tenantId: null,
        telegramUserId: input.telegramUserId,
        telegramChatId: input.telegramChatId,
        pairingCode: input.pairingCode,
        status: "pending",
        issuedAt: now,
        expiresAt: input.expiresAt,
        pairedAt: null
      };
    },

    async findPendingByCode(pairingCode: string): Promise<TelegramPairingRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, tenant_id, telegram_user_id, telegram_chat_id, pairing_code, status, issued_at, expires_at, paired_at FROM telegram_pairings WHERE pairing_code = ?1 AND status = 'pending' ORDER BY issued_at DESC LIMIT 1"
        )
        .bind(pairingCode)
        .first<TelegramPairingRow | null>();

      return row ? toRecord(row) : null;
    },

    async findLatestByTenant(tenantId: string): Promise<TelegramPairingRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, tenant_id, telegram_user_id, telegram_chat_id, pairing_code, status, issued_at, expires_at, paired_at FROM telegram_pairings WHERE tenant_id = ?1 ORDER BY issued_at DESC LIMIT 1"
        )
        .bind(tenantId)
        .first<TelegramPairingRow | null>();

      return row ? toRecord(row) : null;
    },

    async pairToTenant(input: { id: string; tenantId: string }): Promise<void> {
      const now = new Date().toISOString();
      await db
        .prepare(
          "UPDATE telegram_pairings SET tenant_id = ?1, status = 'paired', paired_at = ?2 WHERE id = ?3"
        )
        .bind(input.tenantId, now, input.id)
        .run();
    },

    async expire(id: string): Promise<void> {
      await db
        .prepare("UPDATE telegram_pairings SET status = 'expired' WHERE id = ?1")
        .bind(id)
        .run();
    }
  };
}
