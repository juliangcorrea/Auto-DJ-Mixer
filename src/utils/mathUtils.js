export function roundDownToBase(n) {
  // Check for invalid input (non-numeric or undefined)
  if (typeof n !== 'number' || isNaN(n)) {
      throw new Error("Invalid input: n must be a valid number.");
  }
  
  // Handle zero explicitly to avoid Math.log10(0)
  if (n === 0) return 0;
  
  let base = Math.pow(10, Math.floor(Math.log10(Math.abs(n))));
  let adjustment = base / 2;
  let candidate = n - (n % base);

  if (n < 10 && n >= 0) {
      return roundToTwoDecimals(n);  // assuming roundToTwoDecimals is defined elsewhere
  } else if (n > 10) {
      return n >= candidate + adjustment ? candidate + adjustment : candidate;
  } else {
      return n <= candidate - adjustment ? candidate - adjustment : candidate;
  }
}

export function roundToTwoDecimals(value) {
  if (typeof value !== 'number' || isNaN(value)) {
      console.error('Invalid input for roundToTwoDecimals:', value);
      return 0; // Return 0 if the value is invalid
  }
  return Math.round(value * 100) / 100;
}
