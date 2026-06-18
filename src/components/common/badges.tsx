import { Badge } from "@/components/ui/badge";
import { CATEGORY_BADGE, GOAL_BADGE, INTERACTION_STYLE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  GOAL_LABELS,
  ROUTE_LABELS,
  type GoalTag,
  type InteractionKind,
  type PeptideCategory,
  type Route,
} from "@/types/peptide";

export function CategoryBadge({ category }: { category: string }) {
  const cat = category as PeptideCategory;
  const label = CATEGORY_LABELS[cat] ?? category;
  return (
    <Badge variant="outline" className={cn(CATEGORY_BADGE[cat])}>
      {label}
    </Badge>
  );
}

export function RouteBadge({ route }: { route: string }) {
  const label = ROUTE_LABELS[route as Route] ?? route;
  return <Badge variant="secondary">{label}</Badge>;
}

export function GoalBadges({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const label = GOAL_LABELS[tag as GoalTag] ?? tag;
        return (
          <Badge
            key={tag}
            variant="outline"
            className={cn(GOAL_BADGE[tag as GoalTag])}
          >
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

export function InteractionBadge({ kind }: { kind: string }) {
  const style = INTERACTION_STYLE[kind as InteractionKind];
  return (
    <Badge variant="outline" className={cn(style?.badge)}>
      {style?.label ?? kind}
    </Badge>
  );
}
