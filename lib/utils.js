class Utils {
    static async timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = Utils;