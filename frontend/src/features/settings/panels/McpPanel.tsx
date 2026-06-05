import { useCallback, useEffect, useState } from "react";
import { agentClient, type McpServer, type McpServerStatus } from "@/api";
import { Toggle } from "@/shared/ui/Toggle";
import { Button } from "@/shared/ui/Button";
import { Pill } from "@/shared/ui/Pill";
import { Dialog } from "@/shared/ui/Dialog";
import { Icon } from "@/shared/icons/Icon";
import {
  PlusIcon,
  RefreshIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  McpIcon,
  TrashIcon,
  CloseIcon,
  SpinnerIcon,
} from "@/shared/icons/set";
import { cn } from "@/shared/lib/cn";

/**
 * MCP 服务器面板 — 连真后端 (deepseek-mcp / rmcp).
 *
 * - 列表 + 状态徽章来自 `listMcpServers`
 * - 添加: 粘贴标准 MCP 配置 JSON → `mcpAddServer` (写 mcp.json + 热重载)
 * - 启用/禁用: `toggleMcpServer`; 删除: `mcpRemoveServer`; 重连: `restartMcpServer`
 * - 全部重载: `mcpReload`
 * - 实时状态: 订阅 `onMcpServerStatusChanged` / `onMcpToolsChanged`,无需轮询
 */
export function McpPanel() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setServers(await agentClient.listMcpServers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // 状态变更 / 工具集变更时静默刷新列表 (含 toolCount)。
    const unsubStatus = agentClient.onMcpServerStatusChanged(() => {
      void refresh();
    });
    const unsubTools = agentClient.onMcpToolsChanged(() => {
      void refresh();
    });
    return () => {
      unsubStatus();
      unsubTools();
    };
  }, [refresh]);

  const runAction = useCallback(
    async (name: string, action: () => Promise<void>) => {
      setBusy(name);
      try {
        await action();
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            MCP 服务器
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            连接外部工具与数据源,扩展 Agent 能力。配置写入全局 mcp.json,热重载生效。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            icon={RefreshIcon}
            onClick={() => void agentClient.mcpReload().then(refresh)}
          >
            全部重载
          </Button>
          <Button
            variant="primary"
            icon={PlusIcon}
            onClick={() => setAddOpen(true)}
          >
            添加服务器
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {servers.map((s) => (
          <ServerCard
            key={s.name}
            server={s}
            busy={busy === s.name}
            onToggle={(enabled) =>
              void runAction(s.name, () =>
                agentClient.toggleMcpServer(s.name, enabled),
              )
            }
            onRestart={() =>
              void runAction(s.name, () =>
                agentClient.restartMcpServer(s.name),
              )
            }
            onRemove={() =>
              void runAction(s.name, () => agentClient.mcpRemoveServer(s.name))
            }
          />
        ))}
      </div>

      {!loading && servers.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-default p-8 text-center">
          <Icon
            icon={McpIcon}
            size={28}
            weight="duotone"
            className="text-text-tertiary mx-auto mb-3"
          />
          <div className="text-sm text-text-secondary">尚未配置 MCP 服务器</div>
          <div className="mt-1 text-xs text-text-tertiary">
            点击「添加服务器」,或在对话里直接说「帮我装一个 xxx MCP」让 Agent 自己装。
          </div>
        </div>
      )}

      <AddServerDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={async (name, config) => {
          await agentClient.mcpAddServer(name, config);
          setAddOpen(false);
          await refresh();
        }}
      />
    </div>
  );
}

function ServerCard({
  server,
  busy,
  onToggle,
  onRestart,
  onRemove,
}: {
  server: McpServer;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onRestart: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 bg-elevated",
        server.status === "failed"
          ? "border-danger/30"
          : "border-border-subtle",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            server.status === "connected" && "bg-success-soft text-success",
            server.status === "failed" && "bg-danger-soft text-danger",
            (server.status === "disabled" ||
              server.status === "pending" ||
              server.status === "needs_auth") &&
              "bg-elevated text-text-tertiary border border-border-subtle",
          )}
        >
          <Icon icon={McpIcon} size={16} weight="duotone" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">
              {server.name}
            </span>
            <StatusBadge status={server.status} />
            {server.toolCount > 0 && (
              <span className="text-xs text-text-tertiary">
                {server.toolCount} 个工具
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-text-tertiary mt-1 truncate">
            {server.command} {server.args.join(" ")}
          </div>
          {server.errorMessage && (
            <div className="mt-2 text-xs text-danger break-all">
              {server.errorMessage}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            icon={busy ? SpinnerIcon : RefreshIcon}
            disabled={busy}
            onClick={onRestart}
          >
            重连
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={TrashIcon}
            disabled={busy}
            onClick={onRemove}
            aria-label={`删除 ${server.name}`}
          />
          <Toggle
            checked={server.enabled}
            disabled={busy}
            onChange={onToggle}
            label={`启用 ${server.name}`}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: McpServerStatus }) {
  switch (status) {
    case "connected":
      return (
        <Pill tone="success" icon={CheckCircleIcon}>
          已连接
        </Pill>
      );
    case "failed":
      return (
        <Pill tone="danger" icon={WarningCircleIcon}>
          失败
        </Pill>
      );
    case "disabled":
      return <Pill tone="neutral">已禁用</Pill>;
    case "pending":
      return (
        <Pill tone="info" pulseDot>
          连接中
        </Pill>
      );
    case "needs_auth":
      return <Pill tone="warning">待授权</Pill>;
  }
}

/** 添加服务器对话框 — 粘贴标准 MCP 配置 JSON。 */
function AddServerDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, config: unknown) => Promise<void>;
}) {
  const placeholder = `{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything"]
}`;
  const [name, setName] = useState("");
  const [json, setJson] = useState(placeholder);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setJson(placeholder);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("请填写服务器名称");
      return;
    }
    let config: unknown;
    try {
      config = JSON.parse(json);
    } catch (e) {
      setError(`配置不是合法 JSON: ${e instanceof Error ? e.message : e}`);
      return;
    }
    setSubmitting(true);
    try {
      await onAdd(trimmed, config);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <div className="flex items-center justify-between px-5 h-12 border-b border-border-subtle">
        <span className="text-sm font-semibold text-text-primary">
          添加 MCP 服务器
        </span>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary focus-ring rounded"
          aria-label="关闭"
        >
          <Icon icon={CloseIcon} size={16} />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block">
            服务器名称
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如 everything"
            className={cn(
              "h-9 w-full px-3 rounded-md text-sm bg-input-bg text-text-primary",
              "border border-border-default placeholder:text-text-tertiary",
              "outline-none focus:border-border-focus transition-colors",
            )}
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block">
            配置 JSON (stdio: command/args; 或 {`{"type":"http","url":"..."}`})
          </label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={6}
            spellCheck={false}
            className={cn(
              "w-full px-3 py-2 rounded-md text-xs font-mono bg-input-bg text-text-primary",
              "border border-border-default placeholder:text-text-tertiary",
              "outline-none focus:border-border-focus transition-colors resize-y",
            )}
          />
        </div>
        {error && <div className="text-xs text-danger break-all">{error}</div>}
      </div>
      <div className="flex items-center justify-end gap-2 px-5 h-14 border-t border-border-subtle">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="primary"
          onClick={() => void submit()}
          disabled={submitting}
          icon={submitting ? SpinnerIcon : PlusIcon}
        >
          添加并连接
        </Button>
      </div>
    </Dialog>
  );
}
