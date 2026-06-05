import { cn } from "@/shared/lib/cn";

const PROVIDER_ICON: Record<string, string> = {
  deepseek: "deepseek",
  xiaomi: "xiaomi",
  mimo: "xiaomi",
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  google: "gemini",
  siliconflow: "siliconcloud",
  siliconcloud: "siliconcloud",
  qwen: "qwen",
  dashscope: "qwen",
  zhipu: "zhipu",
  moonshot: "moonshot",
  ollama: "ollama",
};

export function ProviderIcon({
  providerId,
  name,
  size = 16,
  className,
}: {
  providerId: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const icon = PROVIDER_ICON[providerId.toLowerCase()] ?? "generic";
  return (
    <img
      src={`/icons/providers/${icon}.svg`}
      alt={name ?? providerId}
      title={name ?? providerId}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      onError={(e) => {
        e.currentTarget.src = "/icons/providers/generic.svg";
      }}
    />
  );
}
