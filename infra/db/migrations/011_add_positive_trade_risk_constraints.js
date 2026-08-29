exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addConstraint("backtest_trades", "backtest_trades_stop_loss_positive", { check: "stop_loss IS NULL OR stop_loss > 0" });
  pgm.addConstraint("backtest_trades", "backtest_trades_take_profit_positive", { check: "take_profit IS NULL OR take_profit > 0" });
};

exports.down = (pgm) => {
  pgm.dropConstraint("backtest_trades", "backtest_trades_take_profit_positive");
  pgm.dropConstraint("backtest_trades", "backtest_trades_stop_loss_positive");
};
