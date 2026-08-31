import { ReactNode, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface StatEntry {
  abbr: string
  name: string
  definition: string
  formula?: string
  /** How the app gets this number — most are auto-derived from plate appearances; a few are manual taps. */
  source?: string
  core?: boolean
}

const CORE: { category: string; stats: string }[] = [
  { category: 'Hitting', stats: 'AVG, H, BB, SO, RBI, R' },
  { category: 'Pitching', stats: 'ERA, SO, BB, W, L' },
  { category: 'Fielding', stats: 'E, FPCT' },
]

const BATTING: StatEntry[] = [
  { abbr: 'GP', name: 'Games Played', definition: 'Games this player was in the lineup or logged any stat in.' },
  { abbr: 'PA', name: 'Plate Appearances', definition: 'Every trip to the plate — every outcome you log below counts as one.', core: true },
  {
    abbr: 'AB',
    name: 'At Bats',
    definition: 'Plate appearances that count toward batting average.',
    formula: 'PA − BB − HBP − SAC − SF',
  },
  {
    abbr: 'AVG',
    name: 'Batting Average',
    definition: 'The classic "how often do you get a hit" number.',
    formula: 'H ÷ AB',
    core: true,
  },
  {
    abbr: 'OBP',
    name: 'On-Base Percentage',
    definition: 'How often the batter reaches base by any means (hit, walk, or hit-by-pitch).',
    formula: '(H + BB + HBP) ÷ (AB + BB + HBP + SF)',
  },
  {
    abbr: 'SLG',
    name: 'Slugging Percentage',
    definition: 'Average total bases per at-bat — rewards extra-base hits.',
    formula: '(1B + 2×2B + 3×3B + 4×HR) ÷ AB',
  },
  { abbr: 'OPS', name: 'On-Base Plus Slugging', definition: 'OBP and SLG added together — a quick overall offense number.', formula: 'OBP + SLG' },
  { abbr: 'H', name: 'Hits', definition: 'Singles + doubles + triples + home runs.', core: true },
  { abbr: '1B', name: 'Single', definition: 'A hit where the batter reaches first base.' },
  { abbr: '2B', name: 'Double', definition: 'A hit where the batter reaches second base.' },
  { abbr: '3B', name: 'Triple', definition: 'A hit where the batter reaches third base.' },
  { abbr: 'HR', name: 'Home Run', definition: 'A hit that scores the batter all the way around.' },
  { abbr: 'RBI', name: 'Runs Batted In', definition: 'Runs that scored because of this at-bat — you enter the count when you log the plate appearance.', core: true },
  { abbr: 'R', name: 'Runs Scored', definition: 'Times this player crossed home plate.', source: 'manual tap, under Baserunning', core: true },
  { abbr: 'BB', name: 'Walk (Base on Balls)', definition: 'Four balls — batter takes first base.', core: true },
  { abbr: 'SO', name: 'Strikeout (swinging)', definition: 'Batter struck out swinging.', core: true },
  { abbr: 'K-L', name: 'Strikeout Looking', definition: 'Batter struck out without swinging at the last pitch.' },
  { abbr: 'HBP', name: 'Hit By Pitch', definition: 'Batter is hit by a pitch and awarded first base.' },
  { abbr: 'GO', name: 'Ground Out', definition: 'Batter is put out on a ground ball. Counts as an at-bat, same as any other out.' },
  { abbr: 'SAC', name: 'Sacrifice Bunt', definition: 'A bunt that advances a runner but doesn’t count as an at-bat.' },
  { abbr: 'SF', name: 'Sacrifice Fly', definition: 'A fly out deep enough to score a runner; doesn’t count as an at-bat.' },
  { abbr: 'ROE', name: 'Reached On Error', definition: 'Batter reaches base only because the defense made an error.' },
  { abbr: 'FC', name: "Fielder's Choice", definition: 'Defense gets a different runner out instead of the batter, who reaches base.' },
]

const BASERUNNING: StatEntry[] = [
  { abbr: 'SB', name: 'Stolen Base', definition: 'Runner advances a base on a steal attempt that succeeds.', source: 'manual tap, under Baserunning' },
  {
    abbr: 'SB%',
    name: 'Stolen Base Percentage',
    definition: 'How often a steal attempt succeeds.',
    formula: 'SB ÷ (SB + CS)',
  },
  { abbr: 'CS', name: 'Caught Stealing', definition: 'Runner is thrown out attempting to steal.', source: 'manual tap, under Baserunning' },
  { abbr: 'PIK', name: 'Picked Off', definition: 'Runner is put out by the pitcher/catcher while not attempting to steal.', source: 'manual tap, under Baserunning' },
  {
    abbr: 'OA',
    name: 'Out Advancing',
    definition: 'Runner is thrown out trying to take an extra base on a batted ball or an error — not a steal attempt, so it doesn’t count against SB%.',
    source: 'manual tap, under Baserunning',
  },
]

const PITCHING: StatEntry[] = [
  {
    abbr: 'IP',
    name: 'Innings Pitched',
    definition: 'Full innings plus outs into the next one, in the usual .1 / .2 notation (e.g. 4.2 = 4 innings and 2 outs).',
    source: 'derived from Out taps',
    core: true,
  },
  {
    abbr: 'P',
    name: 'Pitches',
    definition: 'Total pitches thrown, if you track pitch-by-pitch — 0 if you skip straight to logging outcomes.',
    source: 'manual tap, under Pitch Count in a batter’s menu',
  },
  { abbr: 'BF', name: 'Batters Faced', definition: 'Total batters this pitcher faced.' },
  { abbr: 'H', name: 'Hits Allowed', definition: 'Hits given up while pitching.' },
  { abbr: 'R', name: 'Runs Allowed', definition: 'All runs that scored while this pitcher was on the mound.' },
  { abbr: 'ER', name: 'Earned Runs', definition: 'Runs that scored without help from a fielding error — the ones that "count against" the pitcher.' },
  { abbr: 'BB', name: 'Walks', definition: 'Batters walked.', core: true },
  { abbr: 'SO', name: 'Strikeouts', definition: 'Batters struck out.', core: true },
  { abbr: 'HR', name: 'Home Runs Allowed', definition: 'Home runs given up.' },
  { abbr: 'HBP', name: 'Hit Batters', definition: 'Batters hit by a pitch.' },
  { abbr: 'W', name: 'Win', definition: 'This pitcher was credited with the win.', source: "set on the game's Pitching panel", core: true },
  { abbr: 'L', name: 'Loss', definition: 'This pitcher was credited with the loss.', source: "set on the game's Pitching panel", core: true },
  {
    abbr: 'ERA',
    name: 'Earned Run Average',
    definition: 'Earned runs allowed per 7-inning game — the standard "how good is this pitcher" number.',
    formula: '(ER ÷ IP) × 7',
    core: true,
  },
  {
    abbr: 'WHIP',
    name: 'Walks + Hits per Inning Pitched',
    definition: 'Baserunners allowed per inning.',
    formula: '(BB + H) ÷ IP',
  },
]

const FIELDING: StatEntry[] = [
  { abbr: 'PO', name: 'Putout', definition: 'This fielder directly recorded an out (caught a fly ball, tagged a base, etc.).' },
  { abbr: 'A', name: 'Assist', definition: 'This fielder threw or deflected the ball to help another fielder record an out.' },
  { abbr: 'E', name: 'Error', definition: 'This fielder botched a play they should have made.', core: true },
  {
    abbr: 'FPCT',
    name: 'Fielding Percentage',
    definition: 'How cleanly a fielder handles their chances.',
    formula: '(PO + A) ÷ (PO + A + E)',
    core: true,
  },
]

export default function GuidePage() {
  // HashRouter already owns the URL's #fragment for routing, so a normal
  // #anchor link can't also point at a section within the page — callers
  // instead pass `state={{ scrollTo: 'section-id' }}` on the <Link>.
  const location = useLocation()
  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo
    if (!scrollTo) return
    // Wait a frame so the page has actually rendered before measuring it.
    const id = requestAnimationFrame(() => {
      document.getElementById(scrollTo)?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [location.state])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Guide</h1>
        <p className="text-slate-500 text-sm mt-1 max-w-2xl">
          What each stat means, how it's calculated, and which ones are worth getting exactly right if you're new to
          scorekeeping.
        </p>
      </div>

      <div className="card p-4 bg-emerald-50 border-emerald-200 text-emerald-900 text-sm space-y-2">
        <p className="font-semibold">How logging works, in one paragraph</p>
        <p>
          Tap a batter to log their plate appearance (hit, walk, strikeout, etc.) and any RBI. Runs, stolen bases,
          caught stealing, and pickoffs are <strong>not</strong> figured out automatically — the app doesn't track
          who's on base, so you tap the runner separately under <strong>Baserunning</strong> in that same menu when
          it happens. On defense, tap a position on the field diagram to assign a fielder and log putouts, assists,
          or errors; tap the pitcher's spot for pitching counters. A batter's menu also has an optional{' '}
          <strong>Pitch Count</strong> section — Ball/Strike/Foul/HBP/In Play — if you want to track the actual
          count; a strikeout or walk pre-fills the outcome below so it's still just one tap to log, and skipping it
          entirely works exactly like before.
        </p>
      </div>

      <section id="core">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">The must-haves</h2>
        <p className="text-slate-500 text-sm mb-3 max-w-2xl">
          If you only track one thing per category, track these — they cover what most people mean when they ask
          "how'd he do." Everything past this is detail for people who want it.
        </p>
        <div className="card p-4 grid sm:grid-cols-3 gap-4">
          {CORE.map((c) => (
            <div key={c.category}>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{c.category}</div>
              <div className="font-mono text-sm text-slate-800">{c.stats}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Where precision matters — and where it doesn't</h2>
        <p className="text-slate-500 text-sm mb-3 max-w-2xl">
          A few pairs of outcomes look like they should matter equally. They don't. If you're unsure mid-game, use
          these rules of thumb:
        </p>
        <div className="card p-4 space-y-3 text-sm">
          <Tip title="SO vs K-L (strikeout swinging vs looking)">
            Doesn't affect any average — pick <strong>SO</strong> if you're not sure. It only changes which counting
            stat it lands under.
          </Tip>
          <Tip title="ROE / FC vs a plain Out">
            Also doesn't affect AVG/OBP/SLG — all three count as an at-bat with no hit, identically. ROE and FC just
            exist so you can also see how often the defense helped a batter reach.
          </Tip>
          <Tip title="SAC / SF vs a plain Out" warn>
            This one <strong>does</strong> matter: SAC and SF don't count as an at-bat, so they protect the
            batter's average; a plain Out does count and lowers it. Worth getting right if the runner was clearly
            being advanced on purpose.
          </Tip>
          <Tip title="CS vs PIK">
            Only affects SB% (stolen-base success rate) — PIK isn't counted as a steal attempt. Doesn't matter for
            anything else, so don't sweat which one it "really" was.
          </Tip>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Scoring a play with an error</h2>
        <p className="text-slate-500 text-sm mb-3 max-w-2xl">
          Errors touch three different players at once — the fielder, the batter, and any runners already on base.
          The app doesn't try to infer that from one tap; you log each part separately, same as everything else here.
        </p>
        <div className="card p-4 space-y-3 text-sm">
          <Tip title="Catch vs. throw — which fielder gets what">
            This is already how PO and A work, not a separate feature: whoever <strong>catches</strong> the ball for
            the out (a fly ball, a tag, a throw received at a base) gets the <strong>Putout</strong>. Whoever fielded
            or threw the ball to set that up gets the <strong>Assist</strong>. A routine ground ball to short is an A
            for the shortstop and a PO for first base.
          </Tip>
          <Tip title="A run that scores because of an error">
            Tap the fielder's position and log <strong>E</strong>. Separately, tap whichever runner scored and log{' '}
            <strong>R</strong> under Baserunning — same as any other run. If the batter also reached base on the same
            error, log their plate appearance as <strong>ROE</strong>. For the pitcher, log it as a plain{' '}
            <strong>R</strong> rather than <strong>ER</strong>, since a run that scores because of an error isn't
            earned.
          </Tip>
          <Tip title="Full example — fly ball dropped in right field, one runner scores, batter thrown out at 2nd">
            Right field's position: log <strong>E</strong> (dropped the catch) and, separately, <strong>A</strong>{' '}
            (threw the batter out advancing). Second base's position: log <strong>PO</strong> (caught the throw for
            the out). The runner who scored: <strong>R</strong> under Baserunning. The batter: <strong>ROE</strong>{' '}
            for their plate appearance, then <strong>Out Advancing</strong> under Baserunning for being thrown out
            trying to stretch it into a double. The pitcher: <strong>R</strong>, not <strong>ER</strong>.
          </Tip>
        </div>
      </section>

      <StatSection id="plate-appearance" title="Hitting" entries={BATTING} />
      <StatSection id="baserunning" title="Baserunning" entries={BASERUNNING} />
      <StatSection id="pitching" title="Pitching" entries={PITCHING} />
      <StatSection id="fielding" title="Fielding" entries={FIELDING} />
    </div>
  )
}

function Tip({ title, warn, children }: { title: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className={`pl-3 border-l-2 ${warn ? 'border-amber-400' : 'border-slate-200'}`}>
      <div className="font-medium text-slate-800">{title}</div>
      <div className="text-slate-600">{children}</div>
    </div>
  )
}

function StatSection({ id, title, entries }: { id: string; title: string; entries: StatEntry[] }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">{title}</h2>
      <div className="card overflow-hidden divide-y divide-slate-100">
        {entries.map((e) => (
          <div key={e.abbr} className="p-3 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <div className="sm:w-40 shrink-0 flex items-center gap-2">
              <span className="font-mono font-semibold text-slate-800">{e.abbr}</span>
              {e.core && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                  must-know
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-800">
                <span className="font-medium">{e.name}</span> — {e.definition}
              </div>
              {e.formula && <div className="text-xs text-slate-500 font-mono mt-0.5">{e.formula}</div>}
              {e.source && <div className="text-xs text-slate-400 mt-0.5">({e.source})</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
