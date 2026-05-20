const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = {
    console,
    Math,
    window: { addEventListener() {} }
};
vm.createContext(context);

function loadScript(file, exportName) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(`${code}\nthis.${exportName} = ${exportName};`, context, { filename: file });
    return context[exportName];
}

const Logic = loadScript("logic.js", "Logic");
const Game = loadScript("game.js", "Game");

assert.strictEqual(Logic.evaluate("(A && !B)", { A: true, B: false, C: false }), true);
assert.strictEqual(Logic.evaluate("(A && !B)", { A: true, B: true, C: false }), false);
assert.strictEqual(JSON.stringify(Logic.getUsedVars("(A && B) || C")), JSON.stringify(["A", "B", "C"]));
assert.strictEqual(Logic.displayExpression("(A && !B) || C"), "(A ∧ ¬B) ∨ C");

const twoVarCombos = Logic.combinationsForVars(["A", "B"]);
assert.strictEqual(twoVarCombos.length, 4);
assert.strictEqual(new Set(twoVarCombos.map(v => `${v.A}:${v.B}:${v.C}`)).size, 4);

for (const pool of Object.values(Logic.expressionsByTier)) {
    for (const expr of pool) {
        const usedVars = Logic.getUsedVars(expr);
        const combos = Logic.combinationsForVars(usedVars);
        assert(
            combos.some(vars => Logic.evaluate(expr, vars)),
            `Expression should have at least one valid assignment: ${expr}`
        );

        const options = Game._buildUpgradeChallengeOptions(expr, usedVars);
        assert(options.length > 0 && options.length <= 4, `Unexpected option count for ${expr}`);
        assert(options.some(option => option.isCorrect), `Challenge should include a correct option: ${expr}`);
        assert.strictEqual(
            new Set(options.map(option => Game._varsKey(option.vars, usedVars))).size,
            options.length,
            `Challenge options should not repeat assignments: ${expr}`
        );

        for (const option of options) {
            assert.strictEqual(option.isCorrect, Logic.evaluate(expr, option.vars));
        }
    }
}

console.log("logic.test.js: ok");
