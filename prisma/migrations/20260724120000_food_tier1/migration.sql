-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fiberGoal" INTEGER,
ADD COLUMN     "sodiumGoal" INTEGER,
ADD COLUMN     "waterGoal" INTEGER;

-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "ingredients" JSONB,
ADD COLUMN     "recipeServings" DOUBLE PRECISION,
ADD COLUMN     "saturatedFat" DOUBLE PRECISION,
ADD COLUMN     "sodium" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sugar" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "FoodLog" ADD COLUMN     "saturatedFat" DOUBLE PRECISION,
ADD COLUMN     "sodium" DOUBLE PRECISION,
ADD COLUMN     "sugar" DOUBLE PRECISION;

