import { createMemo, For, Show } from "solid-js"
import { useRoute } from "../../context/route"
import { useSync } from "../../context/sync"
import { useTheme } from "../../context/theme"
import { Locale } from "../../util/locale"

export function HomeAttentionRail() {
  const route = useRoute()
  const sync = useSync()
  const { theme } = useTheme()

  const sessions = createMemo(() => new Map(sync.data.session.map((session) => [session.id, session])))
  const needsInput = createMemo(() =>
    Object.entries(sync.data.permission)
      .flatMap(([sessionID, permissions]) =>
        permissions.map(() => ({
          sessionID,
          kind: "Permission",
          tone: theme.warning,
        })),
      )
      .concat(
        Object.entries(sync.data.question).flatMap(([sessionID, questions]) =>
          questions.map(() => ({
            sessionID,
            kind: "Question",
            tone: theme.accent,
          })),
        ),
      )
      .filter((item) => sessions().has(item.sessionID))
      .slice(0, 6),
  )
  const running = createMemo(() =>
    Object.entries(sync.data.session_status)
      .filter(([, status]) => status.type !== "idle")
      .map(([sessionID, status]) => ({ sessionID, status }))
      .filter((item) => sessions().has(item.sessionID))
      .slice(0, 4),
  )
  const recent = createMemo(() =>
    sync.data.session
      .filter((session) => !session.parentID && !session.time.archived)
      .toSorted((a, b) => b.time.updated - a.time.updated)
      .slice(0, 5),
  )

  function open(sessionID: string) {
    route.navigate({ type: "session", sessionID })
  }

  return (
    <box
      width={38}
      flexShrink={0}
      height="100%"
      backgroundColor={theme.backgroundPanel}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      gap={1}
    >
      <text fg={theme.text}>
        <b>Attention</b>
      </text>
      <Show when={needsInput().length > 0} fallback={<text fg={theme.textMuted}>No sessions need you right now.</text>}>
        <box gap={1}>
          <For each={needsInput()}>
            {(item) => (
              <RailItem
                title={sessions().get(item.sessionID)?.title ?? item.sessionID}
                label={item.kind}
                color={item.tone}
                onClick={() => open(item.sessionID)}
              />
            )}
          </For>
        </box>
      </Show>

      <Show when={running().length > 0}>
        <box paddingTop={1} gap={1}>
          <text fg={theme.textMuted}>Running</text>
          <For each={running()}>
            {(item) => (
              <RailItem
                title={sessions().get(item.sessionID)?.title ?? item.sessionID}
                label={item.status.type}
                color={theme.success}
                onClick={() => open(item.sessionID)}
              />
            )}
          </For>
        </box>
      </Show>

      <box paddingTop={1} gap={1}>
        <text fg={theme.textMuted}>Recent</text>
        <For each={recent()}>
          {(session) => (
            <RailItem
              title={session.title}
              label={relativeTime(session.time.updated)}
              onClick={() => open(session.id)}
            />
          )}
        </For>
      </box>
    </box>
  )
}

function RailItem(props: {
  title: string
  label: string
  color?: ReturnType<typeof useTheme>["theme"]["text"]
  onClick: () => void
}) {
  const { theme } = useTheme()
  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={theme.backgroundElement}
      onMouseUp={props.onClick}
      flexDirection="column"
    >
      <text fg={theme.text}>{Locale.truncate(props.title || "Untitled session", 30)}</text>
      <text fg={props.color ?? theme.textMuted}>{props.label}</text>
    </box>
  )
}

function relativeTime(value: number) {
  const age = Math.max(0, Date.now() - value)
  if (age < 60_000) return "now"
  if (age < 60 * 60_000) return `${Math.floor(age / 60_000)}m ago`
  if (age < 24 * 60 * 60_000) return `${Math.floor(age / (60 * 60_000))}h ago`
  return `${Math.floor(age / (24 * 60 * 60_000))}d ago`
}
