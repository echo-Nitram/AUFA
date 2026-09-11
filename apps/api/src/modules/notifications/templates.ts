import { Email } from './mailer';

export interface FixtureMatch {
  matchday: number;
  opponent: string;
  isHome: boolean;
  venue: string | null;
  scheduledAt: Date | null;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });

const formatDate = (date: Date | null) =>
  date
    ? date.toLocaleString('es-UY', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'A confirmar';

function layout(leagueName: string, title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f2f5f1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#121d18">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#0e7a4b;font-weight:700">${escapeHtml(leagueName)}</p>
    <h1 style="margin:0 0 20px;font-size:24px;line-height:1.2">${escapeHtml(title)}</h1>
    ${body}
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #d2dcd4;font-size:12px;color:#6d7f76">
      Enviado por AUFA en nombre de ${escapeHtml(leagueName)}.
    </p>
  </div>
</body></html>`;
}

export function fixturePublished(
  to: string,
  leagueName: string,
  teamName: string,
  tournamentName: string,
  matches: FixtureMatch[]
): Email {
  const rows = matches
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e3eae3;font-size:14px;color:#6d7f76;white-space:nowrap">Fecha ${m.matchday}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e3eae3;font-size:15px">
          <strong>${m.isHome ? 'vs' : 'visita a'} ${escapeHtml(m.opponent)}</strong><br>
          <span style="color:#6d7f76;font-size:13px">${escapeHtml(formatDate(m.scheduledAt))}${m.venue ? ' &middot; ' + escapeHtml(m.venue) : ''}</span>
        </td>
      </tr>`
    )
    .join('');

  return {
    to,
    subject: `Fixture de ${tournamentName}: los partidos de ${teamName}`,
    html: layout(
      leagueName,
      'Ya esta el fixture',
      `<p style="margin:0 0 20px;font-size:15px;line-height:1.5">
         Estos son los partidos de <strong>${escapeHtml(teamName)}</strong> en ${escapeHtml(tournamentName)}.
       </p>
       <table style="width:100%;border-collapse:collapse">${rows}</table>`
    ),
  };
}

export function medicalClearanceExpiring(
  to: string,
  playerName: string,
  leagueName: string,
  expiresAt: Date,
  daysLeft: number
): Email {
  const urgency =
    daysLeft <= 0
      ? 'Tu ficha medica esta vencida, asi que no vas a poder ser incluido en la planilla hasta que subas una nueva.'
      : `Tu ficha medica vence en ${daysLeft} dia${daysLeft === 1 ? '' : 's'}. Si se vence, no vas a poder ser incluido en la planilla.`;

  return {
    to,
    subject:
      daysLeft <= 0 ? 'Tu ficha medica vencio' : `Tu ficha medica vence en ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`,
    html: layout(
      leagueName,
      daysLeft <= 0 ? 'Ficha medica vencida' : 'Se vence tu ficha medica',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hola ${escapeHtml(playerName)},</p>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(urgency)}</p>
       <p style="margin:0;font-size:15px;line-height:1.5">
         Vencimiento: <strong>${escapeHtml(expiresAt.toLocaleDateString('es-UY'))}</strong>
       </p>`
    ),
  };
}
