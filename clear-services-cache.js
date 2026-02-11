#!/usr/bin/env node
/**
 * Clear Services Cache from AsyncStorage
 * This script clears the cached services to force a refresh with new catalog
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🧹 Clear Services Cache\n');
console.log('This will clear the cached services from the app.');
console.log('Next time the app opens, it will load fresh services from the new catalog.\n');
console.log('To clear the cache:');
console.log('1. Open your React Native app');
console.log('2. Open Developer Menu (shake device or Cmd+D on iOS simulator)');
console.log('3. Tap "Debug" → "Open React DevTools"');
console.log('4. In the console, run this command:\n');
console.log('   await AsyncStorage.multiRemove(["customServices", "servicesCatalogVersion"]);\n');
console.log('   OR restart the app after running this command:\n');
console.log('   await AsyncStorage.clear();\n');
console.log('Alternative: Uninstall and reinstall the app to clear all AsyncStorage.\n');

rl.question('Press Enter to exit...', () => {
  rl.close();
  process.exit(0);
});
