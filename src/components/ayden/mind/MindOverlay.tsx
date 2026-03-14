"use client";

import { CanvasNode, HealthData, CATEGORY_COLORS } from "./types";

interface MindOverlayProps {
  selectedNode: CanvasNode | null;
  hoveredNode: CanvasNode | null;
  data: HealthData;
}

export default function MindOverlay({
  selectedNode,
  hoveredNode,
  data,
}: MindOverlayProps) {
  const node = selectedNode || hoveredNode;

  return (
    <div className="absolute top-4 right-4 w-72 pointer-events-none">
      {node ? (
        <NodeDetail node={node} />
      ) : (
        <AmbientInfo data={data} />
      )}
    </div>
  );
}

function NodeDetail({ node }: { node: CanvasNode }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-4 pointer-events-auto">
      {node.type === "heart" && <HeartDetail node={node} />}
      {node.type === "neurotransmitter" && <NeuroDetail node={node} />}
      {node.type === "emotion" && <EmotionDetail node={node} />}
      {node.type === "value" && <ValueDetail node={node} />}
      {node.type === "interest" && <InterestDetail node={node} />}
    </div>
  );
}

function HeartDetail({ node }: { node: CanvasNode }) {
  const { bpm, state, restingHR } = node.data as {
    bpm: number;
    state: string;
    restingHR: number;
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <span className="text-sm font-medium text-foreground">Heart</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">BPM</span>
          <p className="text-foreground font-mono">{bpm}</p>
        </div>
        <div>
          <span className="text-muted-foreground">State</span>
          <p className="text-foreground capitalize">{state}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Resting HR</span>
          <p className="text-foreground font-mono">{restingHR}</p>
        </div>
      </div>
    </div>
  );
}

function NeuroDetail({ node }: { node: CanvasNode }) {
  const { type, level, delta, adaptedBaseline, permanentBaseline } =
    node.data as {
      type: string;
      level: number;
      delta: number;
      adaptedBaseline: number;
      permanentBaseline: number;
    };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <span className="text-sm font-medium text-foreground capitalize">
          {type}
        </span>
        <span
          className={`text-xs ml-auto font-mono ${
            delta > 0
              ? "text-green-400"
              : delta < 0
                ? "text-red-400"
                : "text-muted-foreground"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {Math.round(delta)}
        </span>
      </div>

      {/* Level bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Level</span>
          <span className="font-mono">{Math.round(level)}/100</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${level}%`,
              backgroundColor: node.color,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Adapted Baseline</span>
          <p className="text-foreground font-mono">
            {Math.round(adaptedBaseline || 0)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Permanent Baseline</span>
          <p className="text-foreground font-mono">
            {Math.round(permanentBaseline || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmotionDetail({ node }: { node: CanvasNode }) {
  const { dimension, intensity, trigger, context, createdAt } =
    node.data as {
      dimension: string;
      intensity: number;
      trigger: string;
      context: string | null;
      createdAt: string;
    };

  const age = getTimeAgo(createdAt);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <span className="text-sm font-medium text-foreground capitalize">
          {dimension}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">{age}</span>
      </div>

      {/* Intensity dots */}
      <div className="flex gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                i < intensity ? node.color : "rgba(255,255,255,0.06)",
            }}
          />
        ))}
      </div>

      {trigger && (
        <div className="text-xs">
          <span className="text-muted-foreground">Trigger: </span>
          <span className="text-foreground/70">{trigger}</span>
        </div>
      )}
      {context && (
        <div className="text-xs">
          <span className="text-muted-foreground">Context: </span>
          <span className="text-foreground/70">{context}</span>
        </div>
      )}
    </div>
  );
}

function ValueDetail({ node }: { node: CanvasNode }) {
  const { value, category, strength, origin } = node.data as {
    value: string;
    category: string;
    strength: number;
    origin: string | null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: CATEGORY_COLORS[category] || "#888",
          }}
        />
        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground capitalize">
          {category}
        </span>
      </div>
      <p className="text-sm text-foreground leading-snug">{value}</p>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Conviction</span>
          <span className="font-mono">{Math.round(strength * 100)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${strength * 100}%`,
              backgroundColor: CATEGORY_COLORS[category] || "#888",
            }}
          />
        </div>
      </div>

      {origin && (
        <div className="text-xs">
          <span className="text-muted-foreground">Origin: </span>
          <span className="text-foreground/70">{origin}</span>
        </div>
      )}
    </div>
  );
}

function InterestDetail({ node }: { node: CanvasNode }) {
  const { topic, description, intensity, source, lastEngaged } =
    node.data as {
      topic: string;
      description: string | null;
      intensity: number;
      source: string | null;
      lastEngaged: string;
    };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <span className="text-sm font-medium text-foreground">{topic}</span>
      </div>

      {description && (
        <p className="text-xs text-foreground/70 leading-snug">{description}</p>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Intensity</span>
          <span className="font-mono">{Math.round(intensity * 100)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${intensity * 100}%`,
              backgroundColor: node.color,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {source && (
          <div>
            <span className="text-muted-foreground">Source</span>
            <p className="text-foreground/70 capitalize">{source}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Last engaged</span>
          <p className="text-foreground/70">{getTimeAgo(lastEngaged)}</p>
        </div>
      </div>
    </div>
  );
}

function AmbientInfo({ data }: { data: HealthData }) {
  const dominantEmotion = data.emotions[0];
  const { bpm, state } = data.heartRate;

  return (
    <div className="bg-background/60 backdrop-blur-sm border border-border/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          System State
        </span>
        <span className="text-xs text-foreground/50 capitalize">{state}</span>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-red-400 font-mono">{bpm} bpm</span>
        {dominantEmotion && (
          <>
            <span className="text-border">|</span>
            <span className="text-foreground/70 capitalize">
              {dominantEmotion.dimension}
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        <div>
          <p className="text-foreground font-mono">
            {data.stats.thoughtCount}
          </p>
          <p className="text-muted-foreground">thoughts</p>
        </div>
        <div>
          <p className="text-foreground font-mono">{data.stats.dreamCount}</p>
          <p className="text-muted-foreground">dreams</p>
        </div>
        <div>
          <p className="text-foreground font-mono">
            {data.stats.memoryCount}
          </p>
          <p className="text-muted-foreground">memories</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div>
          <p className="text-foreground font-mono">{data.stats.valueCount}</p>
          <p className="text-muted-foreground">values</p>
        </div>
        <div>
          <p className="text-foreground font-mono">
            {data.stats.interestCount}
          </p>
          <p className="text-muted-foreground">interests</p>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
