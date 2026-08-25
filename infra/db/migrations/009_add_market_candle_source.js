exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("market_candles", { source: { type: "text", notNull: true, default: "UNKNOWN" } });
};

exports.down = (pgm) => {
  pgm.dropColumns("market_candles", ["source"]);
};
