const API = process.env.API_PUBLIC_URL ?? "http://localhost:4000";

type Row = {
  reference: string;
  title: string;
  assessment_label: string;
  published_at: string;
};

async function loadPublished(): Promise<Row[]> {
  try {
    const res = await fetch(`${API}/api/v1/civic/public`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { cases?: Row[] };
    return Array.isArray(data.cases) ? data.cases : [];
  } catch {
    return [];
  }
}

function publishedOn(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function CivicLibrary() {
  const rows = await loadPublished();

  if (!rows.length) {
    return (
      <div className="civic-library-empty">
        <p className="kicker">Not a feed</p>
        <h3>No reviewed cases are public yet</h3>
        <p>
          A case appears here only after an editor publishes a redacted page. Submissions stay
          private until then. There is no list of unreviewed claims.
        </p>
        <p className="civic-library-empty-actions">
          <a className="btn" href="/civic/viral">
            Check a post
          </a>
          <a href="/civic/result-sheet">Check a sheet</a>
          <a href="/civic/incident">Report an incident</a>
        </p>
      </div>
    );
  }

  return (
    <ul className="civic-library">
      {rows.map((row) => {
        const when = publishedOn(row.published_at);
        return (
          <li key={row.reference}>
            <a href={`/civic/p/${row.reference}`}>
              <strong>{row.reference}</strong>
              <span>{row.assessment_label}</span>
              {when ? <span>{when}</span> : null}
              <span>{row.title}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
