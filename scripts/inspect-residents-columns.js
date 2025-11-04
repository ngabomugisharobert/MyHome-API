const { sequelize } = require('../src/config/database');

(async () => {
  try {
    const [results] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'residents'"
    );
    console.log('Residents table columns:', results.map(r => r.column_name));
  } catch (error) {
    console.error('Failed to read residents table columns:', error);
  } finally {
    await sequelize.close();
  }
})();

