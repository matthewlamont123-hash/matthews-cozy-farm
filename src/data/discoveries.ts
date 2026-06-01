import type { CropRarity } from './crops'

export interface DiscoveryRecipe {
  id: string
  result: string
  parentA: string
  parentB: string
  cost: number
  name: string
  emoji: string
  rarity: CropRarity
  sellPrice: number
  growSeconds: number
}

export const DISCOVERY_RECIPES = [
  { id: 'd_salsa_plant', result: 'disc_salsa_plant', parentA: 'corn', parentB: 'tomato', cost: 45, name: 'Salsa Plant', emoji: '🫙', rarity: 'uncommon', sellPrice: 58, growSeconds: 28 },
  { id: 'd_fruit_burst', result: 'disc_fruit_burst', parentA: 'strawberry', parentB: 'watermelon', cost: 85, name: 'Fruit Burst', emoji: '💥', rarity: 'gold', sellPrice: 165, growSeconds: 50 },
  { id: 'd_candy_pumpkin', result: 'disc_candy_pumpkin', parentA: 'pumpkin', parentB: 'strawberry', cost: 70, name: 'Candy Pumpkin', emoji: '🍭', rarity: 'rare', sellPrice: 110, growSeconds: 42 },
  { id: 'd_veggie_mix', result: 'disc_veggie_mix', parentA: 'carrot', parentB: 'corn', cost: 38, name: 'Veggie Mix', emoji: '🥗', rarity: 'common', sellPrice: 42, growSeconds: 18 },
  { id: 'd_rainbow_carrot', result: 'disc_rainbow_carrot', parentA: 'carrot', parentB: 'strawberry', cost: 35, name: 'Rainbow Carrot', emoji: '🌈', rarity: 'rare', sellPrice: 85, growSeconds: 24 },
  { id: 'd_moon_corn', result: 'disc_moon_corn', parentA: 'corn', parentB: 'wheat', cost: 40, name: 'Moon Corn', emoji: '🌙', rarity: 'uncommon', sellPrice: 52, growSeconds: 20 },
  { id: 'd_spark_plum', result: 'disc_spark_plum', parentA: 'blueberry', parentB: 'lavender', cost: 65, name: 'Spark Plum', emoji: '✨', rarity: 'gold', sellPrice: 140, growSeconds: 48 },
  { id: 'd_candy_melon', result: 'disc_candy_melon', parentA: 'disc_fruit_burst', parentB: 'goldenApple', cost: 120, name: 'Candy Melon', emoji: '🍬', rarity: 'gold', sellPrice: 155, growSeconds: 52 },

  { id: 'd_root_medley', result: 'disc_root_medley', parentA: 'turnip', parentB: 'carrot', cost: 12, name: 'Root Medley', emoji: '🥕', rarity: 'common', sellPrice: 18, growSeconds: 12 },
  { id: 'd_field_snack', result: 'disc_field_snack', parentA: 'turnip', parentB: 'corn', cost: 18, name: 'Field Snack', emoji: '🌽', rarity: 'common', sellPrice: 22, growSeconds: 14 },
  { id: 'd_harvest_loaf', result: 'disc_harvest_loaf', parentA: 'turnip', parentB: 'wheat', cost: 16, name: 'Harvest Loaf', emoji: '🍞', rarity: 'common', sellPrice: 20, growSeconds: 13 },
  { id: 'd_earth_stew', result: 'disc_earth_stew', parentA: 'turnip', parentB: 'potato', cost: 20, name: 'Earth Stew', emoji: '🍲', rarity: 'common', sellPrice: 26, growSeconds: 16 },
  { id: 'd_spring_salad', result: 'disc_spring_salad', parentA: 'turnip', parentB: 'strawberry', cost: 28, name: 'Spring Salad', emoji: '🥬', rarity: 'uncommon', sellPrice: 38, growSeconds: 20 },
  { id: 'd_sunny_greens', result: 'disc_sunny_greens', parentA: 'turnip', parentB: 'sunflower', cost: 32, name: 'Sunny Greens', emoji: '🌻', rarity: 'uncommon', sellPrice: 44, growSeconds: 22 },
  { id: 'd_garden_bowl', result: 'disc_garden_bowl', parentA: 'turnip', parentB: 'tomato', cost: 30, name: 'Garden Bowl', emoji: '🥣', rarity: 'uncommon', sellPrice: 40, growSeconds: 21 },
  { id: 'd_purple_patch', result: 'disc_purple_patch', parentA: 'turnip', parentB: 'eggplant', cost: 34, name: 'Purple Patch', emoji: '💜', rarity: 'uncommon', sellPrice: 46, growSeconds: 24 },
  { id: 'd_autumn_mash', result: 'disc_autumn_mash', parentA: 'turnip', parentB: 'pumpkin', cost: 42, name: 'Autumn Mash', emoji: '🎃', rarity: 'rare', sellPrice: 62, growSeconds: 30 },
  { id: 'd_calm_leaves', result: 'disc_calm_leaves', parentA: 'turnip', parentB: 'lavender', cost: 48, name: 'Calm Leaves', emoji: '🍃', rarity: 'rare', sellPrice: 68, growSeconds: 32 },
  { id: 'd_berry_greens', result: 'disc_berry_greens', parentA: 'turnip', parentB: 'blueberry', cost: 55, name: 'Berry Greens', emoji: '🫐', rarity: 'rare', sellPrice: 78, growSeconds: 36 },
  { id: 'd_melon_turnip', result: 'disc_melon_turnip', parentA: 'turnip', parentB: 'watermelon', cost: 60, name: 'Melon Turnip', emoji: '🍉', rarity: 'gold', sellPrice: 88, growSeconds: 40 },
  { id: 'd_golden_greens', result: 'disc_golden_greens', parentA: 'turnip', parentB: 'goldenApple', cost: 90, name: 'Golden Greens', emoji: '✨', rarity: 'rainbow', sellPrice: 200, growSeconds: 58 },

  { id: 'd_carrot_bread', result: 'disc_carrot_bread', parentA: 'carrot', parentB: 'wheat', cost: 22, name: 'Carrot Bread', emoji: '🥖', rarity: 'common', sellPrice: 28, growSeconds: 16 },
  { id: 'd_root_stew', result: 'disc_root_stew', parentA: 'carrot', parentB: 'potato', cost: 24, name: 'Root Stew', emoji: '🥘', rarity: 'common', sellPrice: 30, growSeconds: 17 },
  { id: 'd_sunny_carrot', result: 'disc_sunny_carrot', parentA: 'carrot', parentB: 'sunflower', cost: 36, name: 'Sunny Carrot', emoji: '☀️', rarity: 'uncommon', sellPrice: 48, growSeconds: 22 },
  { id: 'd_italian_mix', result: 'disc_italian_mix', parentA: 'carrot', parentB: 'tomato', cost: 32, name: 'Italian Mix', emoji: '🍝', rarity: 'uncommon', sellPrice: 44, growSeconds: 20 },
  { id: 'd_purple_carrot', result: 'disc_purple_carrot', parentA: 'carrot', parentB: 'eggplant', cost: 38, name: 'Purple Carrot', emoji: '🍆', rarity: 'uncommon', sellPrice: 50, growSeconds: 24 },
  { id: 'd_orange_harvest', result: 'disc_orange_harvest', parentA: 'carrot', parentB: 'pumpkin', cost: 44, name: 'Orange Harvest', emoji: '🧡', rarity: 'rare', sellPrice: 64, growSeconds: 28 },
  { id: 'd_herb_carrot', result: 'disc_herb_carrot', parentA: 'carrot', parentB: 'lavender', cost: 46, name: 'Herb Carrot', emoji: '🌿', rarity: 'rare', sellPrice: 70, growSeconds: 30 },
  { id: 'd_berry_carrot', result: 'disc_berry_carrot', parentA: 'carrot', parentB: 'blueberry', cost: 52, name: 'Berry Carrot', emoji: '🫐', rarity: 'rare', sellPrice: 76, growSeconds: 34 },
  { id: 'd_summer_carrot', result: 'disc_summer_carrot', parentA: 'carrot', parentB: 'watermelon', cost: 58, name: 'Summer Carrot', emoji: '🏖️', rarity: 'gold', sellPrice: 92, growSeconds: 38 },
  { id: 'd_gilded_carrot', result: 'disc_gilded_carrot', parentA: 'carrot', parentB: 'goldenApple', cost: 88, name: 'Gilded Carrot', emoji: '🥇', rarity: 'rainbow', sellPrice: 195, growSeconds: 55 },

  { id: 'd_midwest_plate', result: 'disc_midwest_plate', parentA: 'corn', parentB: 'potato', cost: 28, name: 'Midwest Plate', emoji: '🍽️', rarity: 'common', sellPrice: 34, growSeconds: 18 },
  { id: 'd_sweet_corn', result: 'disc_sweet_corn', parentA: 'corn', parentB: 'strawberry', cost: 36, name: 'Sweet Corn', emoji: '🍓', rarity: 'uncommon', sellPrice: 46, growSeconds: 22 },
  { id: 'd_summer_field', result: 'disc_summer_field', parentA: 'corn', parentB: 'sunflower', cost: 38, name: 'Summer Field', emoji: '🌾', rarity: 'uncommon', sellPrice: 50, growSeconds: 24 },
  { id: 'd_grill_platter', result: 'disc_grill_platter', parentA: 'corn', parentB: 'eggplant', cost: 42, name: 'Grill Platter', emoji: '🔥', rarity: 'uncommon', sellPrice: 54, growSeconds: 26 },
  { id: 'd_fall_feast', result: 'disc_fall_feast', parentA: 'corn', parentB: 'pumpkin', cost: 48, name: 'Fall Feast', emoji: '🍂', rarity: 'rare', sellPrice: 66, growSeconds: 30 },
  { id: 'd_corn_breeze', result: 'disc_corn_breeze', parentA: 'corn', parentB: 'lavender', cost: 50, name: 'Corn Breeze', emoji: '💨', rarity: 'rare', sellPrice: 72, growSeconds: 32 },
  { id: 'd_berry_corn', result: 'disc_berry_corn', parentA: 'corn', parentB: 'blueberry', cost: 56, name: 'Berry Corn', emoji: '🫐', rarity: 'rare', sellPrice: 80, growSeconds: 36 },
  { id: 'd_picnic_corn', result: 'disc_picnic_corn', parentA: 'corn', parentB: 'watermelon', cost: 62, name: 'Picnic Corn', emoji: '🧺', rarity: 'gold', sellPrice: 98, growSeconds: 40 },
  { id: 'd_golden_cob', result: 'disc_golden_cob', parentA: 'corn', parentB: 'goldenApple', cost: 92, name: 'Golden Cob', emoji: '🌟', rarity: 'rainbow', sellPrice: 210, growSeconds: 60 },

  { id: 'd_baker_potato', result: 'disc_baker_potato', parentA: 'wheat', parentB: 'potato', cost: 26, name: 'Baker Potato', emoji: '🥔', rarity: 'common', sellPrice: 32, growSeconds: 17 },
  { id: 'd_strawberry_loaf', result: 'disc_strawberry_loaf', parentA: 'wheat', parentB: 'strawberry', cost: 34, name: 'Strawberry Loaf', emoji: '🍰', rarity: 'uncommon', sellPrice: 46, growSeconds: 22 },
  { id: 'd_golden_wheat', result: 'disc_golden_wheat', parentA: 'wheat', parentB: 'sunflower', cost: 40, name: 'Golden Wheat', emoji: '🌾', rarity: 'uncommon', sellPrice: 52, growSeconds: 24 },
  { id: 'd_tomato_bread', result: 'disc_tomato_bread', parentA: 'wheat', parentB: 'tomato', cost: 36, name: 'Tomato Bread', emoji: '🍅', rarity: 'uncommon', sellPrice: 48, growSeconds: 23 },
  { id: 'd_eggplant_loaf', result: 'disc_eggplant_loaf', parentA: 'wheat', parentB: 'eggplant', cost: 44, name: 'Eggplant Loaf', emoji: '🍆', rarity: 'rare', sellPrice: 58, growSeconds: 28 },
  { id: 'd_pumpkin_bread', result: 'disc_pumpkin_bread', parentA: 'wheat', parentB: 'pumpkin', cost: 48, name: 'Pumpkin Bread', emoji: '🎃', rarity: 'rare', sellPrice: 64, growSeconds: 30 },
  { id: 'd_lavender_loaf', result: 'disc_lavender_loaf', parentA: 'wheat', parentB: 'lavender', cost: 52, name: 'Lavender Loaf', emoji: '💜', rarity: 'rare', sellPrice: 74, growSeconds: 34 },
  { id: 'd_berry_muffin', result: 'disc_berry_muffin', parentA: 'wheat', parentB: 'blueberry', cost: 58, name: 'Berry Muffin', emoji: '🧁', rarity: 'gold', sellPrice: 86, growSeconds: 38 },
  { id: 'd_melon_bread', result: 'disc_melon_bread', parentA: 'wheat', parentB: 'watermelon', cost: 64, name: 'Melon Bread', emoji: '🍉', rarity: 'gold', sellPrice: 94, growSeconds: 42 },
  { id: 'd_golden_loaf', result: 'disc_golden_loaf', parentA: 'wheat', parentB: 'goldenApple', cost: 95, name: 'Golden Loaf', emoji: '🥐', rarity: 'rainbow', sellPrice: 220, growSeconds: 62 },

  { id: 'd_berry_spud', result: 'disc_berry_spud', parentA: 'potato', parentB: 'strawberry', cost: 32, name: 'Berry Spud', emoji: '🍓', rarity: 'uncommon', sellPrice: 42, growSeconds: 20 },
  { id: 'd_sun_spud', result: 'disc_sun_spud', parentA: 'potato', parentB: 'sunflower', cost: 38, name: 'Sun Spud', emoji: '🌻', rarity: 'uncommon', sellPrice: 48, growSeconds: 22 },
  { id: 'd_tater_tomato', result: 'disc_tater_tomato', parentA: 'potato', parentB: 'tomato', cost: 34, name: 'Tater Tomato', emoji: '🍅', rarity: 'uncommon', sellPrice: 44, growSeconds: 21 },
  { id: 'd_ragu_plant', result: 'disc_ragu_plant', parentA: 'eggplant', parentB: 'tomato', cost: 46, name: 'Ragu Plant', emoji: '🍝', rarity: 'rare', sellPrice: 60, growSeconds: 28 },
  { id: 'd_meadow_bloom', result: 'disc_meadow_bloom', parentA: 'sunflower', parentB: 'lavender', cost: 54, name: 'Meadow Bloom', emoji: '🌸', rarity: 'rare', sellPrice: 76, growSeconds: 34 },
  { id: 'd_royal_bloom', result: 'disc_royal_bloom', parentA: 'goldenApple', parentB: 'lavender', cost: 100, name: 'Royal Bloom', emoji: '👑', rarity: 'rainbow', sellPrice: 240, growSeconds: 65 },
  { id: 'd_jam_jar', result: 'disc_jam_jar', parentA: 'strawberry', parentB: 'blueberry', cost: 50, name: 'Jam Jar', emoji: '🫙', rarity: 'rare', sellPrice: 82, growSeconds: 32 },
  { id: 'd_star_melon', result: 'disc_star_melon', parentA: 'watermelon', parentB: 'goldenApple', cost: 110, name: 'Star Melon', emoji: '⭐', rarity: 'rainbow', sellPrice: 250, growSeconds: 68 },

  { id: 'd_fire_salsa', result: 'disc_fire_salsa', parentA: 'disc_salsa_plant', parentB: 'tomato', cost: 75, name: 'Fire Salsa', emoji: '🔥', rarity: 'rare', sellPrice: 95, growSeconds: 35 },
  { id: 'd_mega_burst', result: 'disc_mega_burst', parentA: 'disc_fruit_burst', parentB: 'strawberry', cost: 105, name: 'Mega Burst', emoji: '💫', rarity: 'gold', sellPrice: 180, growSeconds: 48 },
  { id: 'd_prism_carrot', result: 'disc_prism_carrot', parentA: 'disc_rainbow_carrot', parentB: 'carrot', cost: 60, name: 'Prism Carrot', emoji: '🔮', rarity: 'rare', sellPrice: 100, growSeconds: 30 },
  { id: 'd_eclipse_corn', result: 'disc_eclipse_corn', parentA: 'disc_moon_corn', parentB: 'corn', cost: 65, name: 'Eclipse Corn', emoji: '🌑', rarity: 'rare', sellPrice: 88, growSeconds: 28 },
  { id: 'd_star_plum', result: 'disc_star_plum', parentA: 'disc_spark_plum', parentB: 'blueberry', cost: 95, name: 'Star Plum', emoji: '🌟', rarity: 'gold', sellPrice: 165, growSeconds: 50 },
  { id: 'd_jack_candy', result: 'disc_jack_candy', parentA: 'disc_candy_pumpkin', parentB: 'pumpkin', cost: 90, name: 'Jack Candy', emoji: '🎃', rarity: 'gold', sellPrice: 145, growSeconds: 46 },
  { id: 'd_hearty_mix', result: 'disc_hearty_mix', parentA: 'disc_veggie_mix', parentB: 'potato', cost: 55, name: 'Hearty Mix', emoji: '🥘', rarity: 'uncommon', sellPrice: 62, growSeconds: 24 },
  { id: 'd_spicy_cob', result: 'disc_spicy_cob', parentA: 'disc_salsa_plant', parentB: 'corn', cost: 70, name: 'Spicy Cob', emoji: '🌶️', rarity: 'uncommon', sellPrice: 72, growSeconds: 26 },
  { id: 'd_bloom_burst', result: 'disc_bloom_burst', parentA: 'disc_meadow_bloom', parentB: 'sunflower', cost: 80, name: 'Bloom Burst', emoji: '🌺', rarity: 'gold', sellPrice: 130, growSeconds: 44 },
  { id: 'd_gilded_jam', result: 'disc_gilded_jam', parentA: 'disc_jam_jar', parentB: 'goldenApple', cost: 115, name: 'Gilded Jam', emoji: '🍯', rarity: 'rainbow', sellPrice: 270, growSeconds: 70 },
  { id: 'd_crystal_melon', result: 'disc_crystal_melon', parentA: 'disc_candy_melon', parentB: 'watermelon', cost: 140, name: 'Crystal Melon', emoji: '💎', rarity: 'rainbow', sellPrice: 290, growSeconds: 72 },
] as const satisfies readonly DiscoveryRecipe[]

export const DISCOVERED_CROP_IDS = DISCOVERY_RECIPES.map((r) => r.result)

export function findDiscoveryRecipe(a: string, b: string): DiscoveryRecipe | undefined {
  return DISCOVERY_RECIPES.find(
    (r) =>
      (r.parentA === a && r.parentB === b) ||
      (r.parentA === b && r.parentB === a),
  )
}
