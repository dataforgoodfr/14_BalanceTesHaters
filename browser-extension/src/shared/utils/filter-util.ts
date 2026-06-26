/**
 * Generic utility to toggle filter values for array and single-value categories
 * Handles both multi-select (array) and single-select (string) filter types
 */
export function toggleFilterValue<
  T extends Record<K, string[] | string | undefined>,
  K extends keyof T,
>(filters: T, category: K, selectedValue: string): T {
  const previousCategoryValue = filters[category];

  if (Array.isArray(previousCategoryValue)) {
    // Multi-select category value
    const newCategoryValue = previousCategoryValue.includes(selectedValue)
      ? previousCategoryValue.filter((v) => v !== selectedValue)
      : [...previousCategoryValue, selectedValue];
    return {
      ...filters,
      [category]: newCategoryValue,
    };
  } else {
    // Single-select category value
    // Set to undefined if clicking current value, otherwise replace with new value
    const newCategoryValue =
      (previousCategoryValue as string) === selectedValue
        ? undefined
        : selectedValue;
    return {
      ...filters,
      [category]: newCategoryValue,
    };
  }
}

/**
 * Check if a filter category has any active filters
 * Returns true if there are values selected (non-empty array or non-undefined string)
 */
export function isCategoryFiltered(
  categoryValue: string[] | string | undefined,
): boolean {
  return Array.isArray(categoryValue)
    ? categoryValue.length > 0
    : categoryValue !== undefined;
}

/**
 * Check if a specific option is selected in a filter category
 * Handles both array (multi-select) and string (single-select) filter values
 */
export function isSelectedOption<
  T extends Record<K, string[] | string | undefined>,
  K extends keyof T,
>(filters: T, category: K, optionValue: string): boolean {
  const categoryValue = filters[category];
  if (Array.isArray(categoryValue)) {
    return categoryValue.includes(optionValue);
  } else {
    return (categoryValue as string) === optionValue;
  }
}
