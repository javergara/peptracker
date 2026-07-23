import Link from "next/link";
import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  UtensilsCrossed,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Input } from "@/components/ui/input";
import { NutritionSummary } from "@/components/food/nutrition-summary";
import { AddFoodForm } from "@/components/food/add-food-form";
import { FoodLogRow } from "@/components/food/food-log-row";
import { MyFoodsList } from "@/components/food/my-foods-list";
import { FoodItemForm } from "@/components/food/food-item-form";
import {
  getFoodLogsForDay,
  getNutritionGoals,
  listFoodItems,
  getCurrentUser,
} from "@/lib/queries";
import { setNutritionGoals } from "@/lib/actions/food";
import { sumNutrition, type Nutrition } from "@/lib/food";
import { MEAL_TYPES } from "@/types/food";
import {
  addDays,
  formatDate,
  parseLocalDate,
  toDateInputValue,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Food" };
export const dynamic = "force-dynamic";

type FoodTab = "today" | "foods" | "goals";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const { date, tab } = await searchParams;
  const activeTab: FoodTab =
    tab === "foods" ? "foods" : tab === "goals" ? "goals" : "today";

  const todayStr = toDateInputValue(new Date());
  const dateStr = parseLocalDate(date ?? "") ? (date as string) : todayStr;
  const viewedDate = parseLocalDate(dateStr)!;
  const isToday = dateStr === todayStr;

  const [user, logs, items, goals] = await Promise.all([
    getCurrentUser(),
    getFoodLogsForDay(viewedDate),
    listFoodItems(),
    getNutritionGoals(),
  ]);

  const totals: Nutrition = sumNutrition(
    logs.map((l) => ({
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat,
      fiber: l.fiber,
    })),
  );

  // Group the day's logs by meal, preserving the MEAL_TYPES order.
  const byMeal = new Map<string, typeof logs>();
  for (const m of MEAL_TYPES) byMeal.set(m.key, []);
  for (const log of logs) {
    const key = byMeal.has(log.mealType) ? log.mealType : "snack";
    byMeal.get(key)!.push(log);
  }

  const prevStr = toDateInputValue(addDays(viewedDate, -1));
  const nextStr = toDateInputValue(addDays(viewedDate, 1));
  const dateHref = (d: string) => `/food?date=${d}`;

  const itemOptions = items.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    servingUnit: i.servingUnit,
    calories: i.calories,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
    fiber: i.fiber,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Food & Calories"
        description="Log meals, track calories and macros, and hit your daily targets."
        accentColor={user.color ?? undefined}
      />

      <Disclaimer className="mb-6" />

      {/* Tabs */}
      <div className="border-border mb-6 flex gap-1 border-b">
        {(
          [
            { key: "today", label: "Today", href: dateHref(dateStr) },
            { key: "foods", label: "My Foods", href: "/food?tab=foods" },
            { key: "goals", label: "Goals", href: "/food?tab=goals" },
          ] as const
        ).map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === t.key
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "today" ? (
        <div className="space-y-6">
          {/* Date navigation */}
          <div className="flex items-center justify-between">
            <Link
              href={dateHref(prevStr)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <div className="text-center">
              <p className="font-medium">
                {isToday ? "Today" : formatDate(viewedDate, "EEEE")}
              </p>
              <p className="num text-muted-foreground text-xs">
                {formatDate(viewedDate, "MMM d, yyyy")}
              </p>
            </div>
            <Link
              href={dateHref(nextStr)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <NutritionSummary totals={totals} goals={goals} />

          {/* Add food */}
          <div className="card-surface rounded-2xl">
            <div className="border-border border-b px-5 pt-4 pb-3">
              <Eyebrow className="mb-1">Log food</Eyebrow>
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Plus className="size-4" />
                Add to {isToday ? "today" : formatDate(viewedDate, "MMM d")}
              </h2>
            </div>
            <div className="px-5 py-4">
              <AddFoodForm date={dateStr} items={itemOptions} />
            </div>
          </div>

          {/* Logged meals */}
          {logs.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="size-6" />}
              title="No food logged for this day"
              description="Add your first entry above, or quick-add a saved food from My Foods."
            />
          ) : (
            <div className="space-y-5">
              {MEAL_TYPES.map((m) => {
                const mealLogs = byMeal.get(m.key) ?? [];
                if (mealLogs.length === 0) return null;
                const mealCals = mealLogs.reduce((s, l) => s + l.calories, 0);
                return (
                  <section key={m.key} aria-labelledby={`meal-${m.key}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <Eyebrow id={`meal-${m.key}`}>{m.label}</Eyebrow>
                      <span className="num text-muted-foreground text-xs">
                        {Math.round(mealCals)} kcal
                      </span>
                    </div>
                    <div className="card-surface divide-border divide-y rounded-2xl">
                      {mealLogs.map((log) => (
                        <FoodLogRow key={log.id} log={log} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "foods" ? (
        <div className="space-y-6">
          <div className="card-surface rounded-2xl">
            <div className="border-border border-b px-5 pt-4 pb-3">
              <Eyebrow className="mb-1">New saved food</Eyebrow>
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <BookMarked className="size-4" />
                Add to My Foods
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Save foods with their per-serving nutrition, then quick-add them
                to any day&rsquo;s log.
              </p>
            </div>
            <div className="px-5 py-4">
              <FoodItemForm />
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={<BookMarked className="size-6" />}
              title="No saved foods yet"
              description="Add a food above to build a reusable library for one-tap logging."
            />
          ) : (
            <section aria-labelledby="my-foods-heading">
              <div className="mb-3">
                <Eyebrow id="my-foods-heading">
                  My Foods &mdash; <span className="num">{items.length}</span>
                </Eyebrow>
              </div>
              <MyFoodsList items={items} date={todayStr} />
            </section>
          )}
        </div>
      ) : null}

      {activeTab === "goals" ? (
        <div className="card-surface max-w-lg rounded-2xl">
          <div className="border-border border-b px-5 pt-4 pb-3">
            <Eyebrow className="mb-1">Daily targets</Eyebrow>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Target className="size-4" />
              Nutrition goals
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Set daily calorie and macro targets. Leave a field blank to track
              it without a goal.
            </p>
          </div>
          <div className="px-5 py-4">
            <ActionForm
              action={setNutritionGoals}
              success="Goals saved"
              resetOnSuccess={false}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <label htmlFor="goal-cal" className="text-sm font-medium">
                  Calories (kcal)
                </label>
                <Input
                  id="goal-cal"
                  name="calorieGoal"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={goals.calorieGoal ?? ""}
                  placeholder="e.g. 2200"
                  className="num"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="goal-protein" className="text-sm font-medium">
                  Protein (g)
                </label>
                <Input
                  id="goal-protein"
                  name="proteinGoal"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={goals.proteinGoal ?? ""}
                  placeholder="e.g. 160"
                  className="num"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="goal-carb" className="text-sm font-medium">
                  Carbs (g)
                </label>
                <Input
                  id="goal-carb"
                  name="carbGoal"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={goals.carbGoal ?? ""}
                  placeholder="e.g. 220"
                  className="num"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="goal-fat" className="text-sm font-medium">
                  Fat (g)
                </label>
                <Input
                  id="goal-fat"
                  name="fatGoal"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={goals.fatGoal ?? ""}
                  placeholder="e.g. 70"
                  className="num"
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton>
                  <Target className="size-4" />
                  Save goals
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}
