// ============================================================
//  LINE Bot 設定
//  請至 GAS「專案設定 → 指令碼屬性」設定以下兩個 key：
//    LINE_CHANNEL_ACCESS_TOKEN  —  LINE Channel Access Token
//    WEBAPP_URL                 —  GAS 部署後的網頁應用 URL（exec 結尾）
// ============================================================
const LINE_CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN") || "";
const WEBAPP_URL = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL") || "";

// ============================================================
// 群組成員進度統計常數
// ============================================================
const TOTAL_PLAN_DAYS = 364;
const TOTAL_OT_CHAPTERS = 929;
const TOTAL_NT_CHAPTERS = 260;

// 新舊約書卷名稱常數（全域共用，避免重複定義）
const OT_BOOKS_SET = new Set(["創世記", "出埃及記", "利未記", "民數記", "申命記", "約書亞記", "士師記", "路得記", "撒母耳記上", "撒母耳記下", "列王紀上", "列王紀下", "歷代志上", "歷代志下", "以斯拉記", "尼希米記", "以斯帖記", "約伯記", "詩篇", "箴言", "傳道書", "雅歌", "以賽亞書", "耶利米書", "耶利米哀歌", "以西結書", "但以理書", "何西阿書", "約珥書", "阿摩司書", "俄巴底亞書", "約拿書", "彌迦書", "那鴻書", "哈巴谷書", "西番雅書", "哈該書", "撒加利亞書", "瑪拉基書"]);
const NT_BOOKS_SET = new Set(["馬太福音", "馬可福音", "路加福音", "約翰福音", "使徒行傳", "羅馬書", "哥林多前書", "哥林多後書", "加拉太書", "以弗所書", "腓立比書", "歌羅西書", "帖撒羅尼迦前書", "帖撒羅尼迦後書", "提摩太前書", "提摩太後書", "提多書", "腓利門書", "希伯來書", "雅各書", "彼得前書", "彼得後書", "約翰一書", "約翰二書", "約翰三書", "猶大書", "啟示錄"]);

const PLAN_CHAPTER_MAPPING = {
  "2_OT": ["創世記_1"],
  "2_NT": ["馬太福音_1"],
  "3_OT": ["創世記_2"],
  "3_NT": ["馬太福音_2"],
  "4_NT": ["馬太福音_3"],
  "5_OT": ["創世記_3","創世記_4"],
  "5_NT": ["馬太福音_4"],
  "6_OT": ["創世記_5","創世記_6"],
  "7_OT": ["創世記_7","創世記_8"],
  "7_NT": ["馬太福音_5"],
  "8_OT": ["創世記_9","創世記_10"],
  "9_OT": ["創世記_11","創世記_12"],
  "9_NT": ["馬太福音_6"],
  "10_OT": ["創世記_13","創世記_14"],
  "10_NT": ["馬太福音_7"],
  "11_OT": ["創世記_15","創世記_16"],
  "11_NT": ["馬太福音_8"],
  "12_OT": ["創世記_17","創世記_18"],
  "13_OT": ["創世記_19","創世記_20"],
  "13_NT": ["馬太福音_9"],
  "14_OT": ["創世記_21","創世記_22"],
  "14_NT": ["馬太福音_10"],
  "15_OT": ["創世記_23","創世記_24"],
  "15_NT": ["馬太福音_11"],
  "16_OT": ["創世記_25","創世記_26"],
  "17_OT": ["創世記_27","創世記_28"],
  "17_NT": ["馬太福音_12"],
  "18_OT": ["創世記_29","創世記_30"],
  "19_OT": ["創世記_31"],
  "20_OT": ["創世記_32","創世記_33","創世記_34"],
  "20_NT": ["馬太福音_13"],
  "21_OT": ["創世記_35","創世記_36"],
  "21_NT": ["馬太福音_14"],
  "22_OT": ["創世記_37","創世記_38","創世記_39"],
  "22_NT": ["馬太福音_15"],
  "23_OT": ["創世記_40","創世記_41"],
  "24_OT": ["創世記_42","創世記_43"],
  "25_OT": ["創世記_44","創世記_45"],
  "25_NT": ["馬太福音_16","馬太福音_17"],
  "26_OT": ["創世記_46","創世記_47"],
  "26_NT": ["馬太福音_18"],
  "27_OT": ["創世記_48"],
  "28_OT": ["創世記_49","創世記_50"],
  "28_NT": ["馬太福音_19"],
  "29_OT": ["出埃及記_1","出埃及記_2"],
  "29_NT": ["馬太福音_20"],
  "30_OT": ["出埃及記_3","出埃及記_4"],
  "30_NT": ["馬太福音_21"],
  "31_OT": ["出埃及記_5","出埃及記_6"],
  "32_OT": ["出埃及記_7","出埃及記_8"],
  "32_NT": ["馬太福音_22"],
  "33_OT": ["出埃及記_9","出埃及記_10"],
  "33_NT": ["馬太福音_23"],
  "34_OT": ["出埃及記_11"],
  "35_OT": ["出埃及記_12"],
  "35_NT": ["馬太福音_24"],
  "36_OT": ["出埃及記_13","出埃及記_14"],
  "37_OT": ["出埃及記_15"],
  "38_OT": ["出埃及記_16"],
  "38_NT": ["馬太福音_25"],
  "39_OT": ["出埃及記_17","出埃及記_18"],
  "40_OT": ["出埃及記_19","出埃及記_20"],
  "40_NT": ["馬太福音_26"],
  "41_OT": ["出埃及記_21","出埃及記_22"],
  "41_NT": ["馬太福音_27"],
  "42_OT": ["出埃及記_23","出埃及記_24"],
  "42_NT": ["馬太福音_28"],
  "44_OT": ["出埃及記_25"],
  "45_NT": ["馬可福音_1"],
  "46_OT": ["出埃及記_26"],
  "46_NT": ["馬可福音_2"],
  "47_OT": ["出埃及記_27"],
  "47_NT": ["馬可福音_3"],
  "48_OT": ["出埃及記_28"],
  "49_NT": ["馬可福音_4","馬可福音_5"],
  "50_OT": ["出埃及記_29"],
  "51_NT": ["馬可福音_6"],
  "52_OT": ["出埃及記_30","出埃及記_31"],
  "52_NT": ["馬可福音_7"],
  "53_OT": ["出埃及記_32","出埃及記_33"],
  "53_NT": ["馬可福音_8"],
  "54_OT": ["出埃及記_34","出埃及記_35"],
  "54_NT": ["馬可福音_9"],
  "55_OT": ["出埃及記_36","出埃及記_37","出埃及記_38"],
  "55_NT": ["馬可福音_10"],
  "56_OT": ["出埃及記_39","出埃及記_40"],
  "57_OT": ["利未記_1"],
  "57_NT": ["馬可福音_11"],
  "58_OT": ["利未記_2","利未記_3"],
  "58_NT": ["馬可福音_12","馬可福音_13"],
  "59_OT": ["利未記_4"],
  "60_OT": ["利未記_5"],
  "61_OT": ["利未記_6","利未記_7"],
  "61_NT": ["馬可福音_14"],
  "62_OT": ["利未記_8","利未記_9"],
  "62_NT": ["馬可福音_15"],
  "63_OT": ["利未記_10"],
  "63_NT": ["馬可福音_16"],
  "64_OT": ["利未記_11","利未記_12"],
  "65_OT": ["利未記_13"],
  "66_NT": ["路加福音_1"],
  "67_OT": ["利未記_14"],
  "68_OT": ["利未記_15"],
  "68_NT": ["路加福音_2"],
  "69_OT": ["利未記_16"],
  "69_NT": ["路加福音_3"],
  "70_OT": ["利未記_17","利未記_18"],
  "70_NT": ["路加福音_4"],
  "71_OT": ["利未記_19","利未記_20"],
  "71_NT": ["路加福音_5"],
  "72_OT": ["利未記_21","利未記_22"],
  "72_NT": ["路加福音_6"],
  "74_OT": ["利未記_23","利未記_24"],
  "74_NT": ["路加福音_7"],
  "75_OT": ["利未記_25"],
  "75_NT": ["路加福音_8"],
  "76_OT": ["利未記_26"],
  "77_OT": ["利未記_27"],
  "77_NT": ["路加福音_9"],
  "78_OT": ["民數記_1","民數記_2"],
  "79_OT": ["民數記_3","民數記_4"],
  "79_NT": ["路加福音_10"],
  "80_OT": ["民數記_5","民數記_6"],
  "81_OT": ["民數記_7","民數記_8"],
  "81_NT": ["路加福音_11"],
  "82_OT": ["民數記_9","民數記_10"],
  "83_OT": ["民數記_11","民數記_12","民數記_13","民數記_14"],
  "83_NT": ["路加福音_12"],
  "84_OT": ["民數記_15","民數記_16"],
  "84_NT": ["路加福音_13"],
  "85_OT": ["民數記_17","民數記_18","民數記_19"],
  "85_NT": ["路加福音_14"],
  "86_OT": ["民數記_20","民數記_21"],
  "86_NT": ["路加福音_15"],
  "87_OT": ["民數記_22","民數記_23","民數記_24"],
  "88_OT": ["民數記_25","民數記_26","民數記_27"],
  "88_NT": ["路加福音_16"],
  "89_OT": ["民數記_28","民數記_29","民數記_30"],
  "89_NT": ["路加福音_17"],
  "90_OT": ["民數記_31","民數記_32","民數記_33"],
  "90_NT": ["路加福音_18"],
  "91_OT": ["民數記_34","民數記_35","民數記_36"],
  "92_OT": ["申命記_1","申命記_2"],
  "92_NT": ["路加福音_19"],
  "93_OT": ["申命記_3","申命記_4"],
  "93_NT": ["路加福音_20"],
  "94_OT": ["申命記_5","申命記_6","申命記_7"],
  "94_NT": ["路加福音_21"],
  "95_OT": ["申命記_8","申命記_9"],
  "96_OT": ["申命記_10","申命記_11"],
  "96_NT": ["路加福音_22"],
  "97_OT": ["申命記_12","申命記_13"],
  "97_NT": ["路加福音_23"],
  "98_OT": ["申命記_14","申命記_15"],
  "98_NT": ["路加福音_24"],
  "99_OT": ["申命記_16","申命記_17","申命記_18","申命記_19"],
  "100_OT": ["申命記_20","申命記_21","申命記_22"],
  "100_NT": ["約翰福音_1"],
  "101_OT": ["申命記_23","申命記_24","申命記_25"],
  "102_OT": ["申命記_26","申命記_27"],
  "102_NT": ["約翰福音_2"],
  "103_OT": ["申命記_28","申命記_29"],
  "103_NT": ["約翰福音_3"],
  "104_OT": ["申命記_30","申命記_31","申命記_32"],
  "105_OT": ["申命記_33","申命記_34"],
  "105_NT": ["約翰福音_4"],
  "106_OT": ["約書亞記_1","約書亞記_2"],
  "107_OT": ["約書亞記_3","約書亞記_4","約書亞記_5"],
  "107_NT": ["約翰福音_5"],
  "108_OT": ["約書亞記_6","約書亞記_7","約書亞記_8"],
  "109_OT": ["約書亞記_9","約書亞記_10","約書亞記_11","約書亞記_12"],
  "109_NT": ["約翰福音_6"],
  "110_OT": ["約書亞記_13","約書亞記_14","約書亞記_15","約書亞記_16","約書亞記_17"],
  "111_OT": ["約書亞記_18","約書亞記_19","約書亞記_20","約書亞記_21"],
  "112_OT": ["約書亞記_22","約書亞記_23","約書亞記_24"],
  "112_NT": ["約翰福音_7"],
  "113_OT": ["士師記_1","士師記_2"],
  "113_NT": ["約翰福音_8"],
  "114_OT": ["士師記_3","士師記_4","士師記_5"],
  "114_NT": ["約翰福音_9"],
  "115_OT": ["士師記_6","士師記_7"],
  "116_OT": ["士師記_8","士師記_9","士師記_10","士師記_11","士師記_12"],
  "116_NT": ["約翰福音_10"],
  "117_OT": ["士師記_13","士師記_14","士師記_15","士師記_16"],
  "117_NT": ["約翰福音_11"],
  "118_OT": ["士師記_17","士師記_18","士師記_19"],
  "119_OT": ["士師記_20","士師記_21"],
  "119_NT": ["約翰福音_12"],
  "120_OT": ["路得記_1","路得記_2"],
  "120_NT": ["約翰福音_13"],
  "121_OT": ["路得記_3","路得記_4"],
  "122_OT": ["撒母耳記上_1","撒母耳記上_2","撒母耳記上_3"],
  "122_NT": ["約翰福音_14"],
  "123_OT": ["撒母耳記上_4","撒母耳記上_5","撒母耳記上_6"],
  "123_NT": ["約翰福音_15"],
  "124_OT": ["撒母耳記上_7","撒母耳記上_8","撒母耳記上_9"],
  "124_NT": ["約翰福音_16"],
  "125_OT": ["撒母耳記上_10","撒母耳記上_11","撒母耳記上_12","撒母耳記上_13"],
  "126_OT": ["撒母耳記上_14","撒母耳記上_15"],
  "127_OT": ["撒母耳記上_16","撒母耳記上_17"],
  "127_NT": ["約翰福音_17"],
  "128_OT": ["撒母耳記上_18","撒母耳記上_19","撒母耳記上_20"],
  "128_NT": ["約翰福音_18"],
  "129_OT": ["撒母耳記上_21","撒母耳記上_22","撒母耳記上_23","撒母耳記上_24"],
  "130_OT": ["撒母耳記上_25","撒母耳記上_26","撒母耳記上_27","撒母耳記上_28"],
  "130_NT": ["約翰福音_19"],
  "131_OT": ["撒母耳記上_29","撒母耳記上_30","撒母耳記上_31"],
  "132_OT": ["撒母耳記下_1","撒母耳記下_2"],
  "132_NT": ["約翰福音_20"],
  "133_OT": ["撒母耳記下_3","撒母耳記下_4","撒母耳記下_5"],
  "133_NT": ["約翰福音_21"],
  "134_OT": ["撒母耳記下_6","撒母耳記下_7"],
  "134_NT": ["使徒行傳_1"],
  "135_OT": ["撒母耳記下_8","撒母耳記下_9","撒母耳記下_10","撒母耳記下_11"],
  "136_OT": ["撒母耳記下_12","撒母耳記下_13"],
  "137_OT": ["撒母耳記下_14","撒母耳記下_15","撒母耳記下_16"],
  "137_NT": ["使徒行傳_2"],
  "138_OT": ["撒母耳記下_17","撒母耳記下_18","撒母耳記下_19"],
  "138_NT": ["使徒行傳_3"],
  "139_OT": ["撒母耳記下_20","撒母耳記下_21","撒母耳記下_22"],
  "139_NT": ["使徒行傳_4"],
  "140_OT": ["撒母耳記下_23","撒母耳記下_24"],
  "140_NT": ["使徒行傳_5","使徒行傳_6"],
  "141_OT": ["列王紀上_1"],
  "141_NT": ["使徒行傳_7"],
  "142_OT": ["列王紀上_2","列王紀上_3"],
  "142_NT": ["使徒行傳_8"],
  "143_OT": ["列王紀上_4","列王紀上_5","列王紀上_6"],
  "143_NT": ["使徒行傳_9"],
  "144_OT": ["列王紀上_7"],
  "145_OT": ["列王紀上_8"],
  "145_NT": ["使徒行傳_10","使徒行傳_11"],
  "146_OT": ["列王紀上_9","列王紀上_10"],
  "146_NT": ["使徒行傳_12"],
  "147_OT": ["列王紀上_11"],
  "147_NT": ["使徒行傳_13"],
  "148_OT": ["列王紀上_12","列王紀上_13"],
  "148_NT": ["使徒行傳_14"],
  "149_OT": ["列王紀上_14","列王紀上_15"],
  "149_NT": ["使徒行傳_15"],
  "150_OT": ["列王紀上_16","列王紀上_17","列王紀上_18"],
  "150_NT": ["使徒行傳_16"],
  "151_OT": ["列王紀上_19","列王紀上_20"],
  "151_NT": ["使徒行傳_17"],
  "152_OT": ["列王紀上_21","列王紀上_22","列王紀下_1"],
  "152_NT": ["使徒行傳_18"],
  "153_OT": ["列王紀下_2","列王紀下_3","列王紀下_4"],
  "153_NT": ["使徒行傳_19"],
  "154_OT": ["列王紀下_5","列王紀下_6","列王紀下_7"],
  "154_NT": ["使徒行傳_20"],
  "155_OT": ["列王紀下_8","列王紀下_9"],
  "156_OT": ["列王紀下_10","列王紀下_11","列王紀下_12"],
  "156_NT": ["使徒行傳_21"],
  "157_OT": ["列王紀下_13","列王紀下_14","列王紀下_15"],
  "157_NT": ["使徒行傳_22"],
  "158_OT": ["列王紀下_16","列王紀下_17"],
  "158_NT": ["使徒行傳_23","使徒行傳_24"],
  "159_OT": ["列王紀下_18","列王紀下_19"],
  "159_NT": ["使徒行傳_25","使徒行傳_26"],
  "160_OT": ["列王紀下_20","列王紀下_21","列王紀下_22"],
  "160_NT": ["使徒行傳_27"],
  "161_OT": ["列王紀下_23","列王紀下_24","列王紀下_25"],
  "161_NT": ["使徒行傳_28"],
  "162_OT": ["歷代志上_1","歷代志上_2","歷代志上_3"],
  "163_OT": ["歷代志上_4","歷代志上_5","歷代志上_6"],
  "163_NT": ["羅馬書_1"],
  "164_OT": ["歷代志上_7","歷代志上_8","歷代志上_9"],
  "164_NT": ["羅馬書_2"],
  "165_OT": ["歷代志上_10","歷代志上_11","歷代志上_12"],
  "165_NT": ["羅馬書_3"],
  "166_OT": ["歷代志上_13","歷代志上_14","歷代志上_15","歷代志上_16"],
  "166_NT": ["羅馬書_4"],
  "167_OT": ["歷代志上_17","歷代志上_18","歷代志上_19","歷代志上_20"],
  "168_OT": ["歷代志上_21","歷代志上_22","歷代志上_23"],
  "168_NT": ["羅馬書_5"],
  "169_OT": ["歷代志上_24","歷代志上_25","歷代志上_26"],
  "169_NT": ["羅馬書_6"],
  "170_OT": ["歷代志上_27","歷代志上_28","歷代志上_29"],
  "170_NT": ["羅馬書_7"],
  "171_OT": ["歷代志下_1","歷代志下_2","歷代志下_3"],
  "172_OT": ["歷代志下_4","歷代志下_5","歷代志下_6"],
  "173_OT": ["歷代志下_7","歷代志下_8"],
  "173_NT": ["羅馬書_8"],
  "174_OT": ["歷代志下_9"],
  "174_NT": ["羅馬書_9"],
  "175_OT": ["歷代志下_10","歷代志下_11"],
  "175_NT": ["羅馬書_10"],
  "176_OT": ["歷代志下_12","歷代志下_13","歷代志下_14","歷代志下_15"],
  "176_NT": ["羅馬書_11"],
  "177_OT": ["歷代志下_16","歷代志下_17","歷代志下_18","歷代志下_19"],
  "178_OT": ["歷代志下_20","歷代志下_21","歷代志下_22"],
  "178_NT": ["羅馬書_12","羅馬書_13"],
  "179_OT": ["歷代志下_23","歷代志下_24","歷代志下_25","歷代志下_26"],
  "179_NT": ["羅馬書_14"],
  "180_OT": ["歷代志下_27","歷代志下_28","歷代志下_29"],
  "181_OT": ["歷代志下_30","歷代志下_31","歷代志下_32"],
  "181_NT": ["羅馬書_15"],
  "182_OT": ["歷代志下_33","歷代志下_34","歷代志下_35","歷代志下_36"],
  "182_NT": ["羅馬書_16"],
  "183_OT": ["以斯拉記_1","以斯拉記_2"],
  "184_OT": ["以斯拉記_3","以斯拉記_4","以斯拉記_5","以斯拉記_6"],
  "184_NT": ["哥林多前書_1"],
  "185_OT": ["以斯拉記_7","以斯拉記_8"],
  "185_NT": ["哥林多前書_2"],
  "186_OT": ["以斯拉記_9","以斯拉記_10"],
  "187_OT": ["尼希米記_1","尼希米記_2"],
  "187_NT": ["哥林多前書_3"],
  "188_OT": ["尼希米記_3","尼希米記_4"],
  "188_NT": ["哥林多前書_4","哥林多前書_5"],
  "189_OT": ["尼希米記_5"],
  "190_OT": ["尼希米記_6","尼希米記_7","尼希米記_8"],
  "190_NT": ["哥林多前書_6"],
  "191_OT": ["尼希米記_9","尼希米記_10"],
  "191_NT": ["哥林多前書_7","哥林多前書_8"],
  "192_OT": ["尼希米記_11","尼希米記_12"],
  "192_NT": ["哥林多前書_9"],
  "193_OT": ["尼希米記_13"],
  "194_OT": ["以斯帖記_1","以斯帖記_2","以斯帖記_3"],
  "194_NT": ["哥林多前書_10"],
  "195_OT": ["以斯帖記_4","以斯帖記_5","以斯帖記_6","以斯帖記_7"],
  "196_OT": ["以斯帖記_8","以斯帖記_9","以斯帖記_10"],
  "196_NT": ["哥林多前書_11"],
  "197_OT": ["約伯記_1","約伯記_2","約伯記_3"],
  "197_NT": ["哥林多前書_12"],
  "198_OT": ["約伯記_4","約伯記_5","約伯記_6","約伯記_7","約伯記_8","約伯記_9"],
  "198_NT": ["哥林多前書_13"],
  "199_OT": ["約伯記_10","約伯記_11","約伯記_12","約伯記_13","約伯記_14","約伯記_15","約伯記_16","約伯記_17"],
  "200_OT": ["約伯記_18","約伯記_19","約伯記_20","約伯記_21","約伯記_22","約伯記_23"],
  "200_NT": ["哥林多前書_14"],
  "201_OT": ["約伯記_24","約伯記_25","約伯記_26","約伯記_27","約伯記_28","約伯記_29","約伯記_30","約伯記_31"],
  "202_OT": ["約伯記_32","約伯記_33","約伯記_34","約伯記_35","約伯記_36","約伯記_37"],
  "202_NT": ["哥林多前書_15"],
  "203_OT": ["約伯記_38","約伯記_39","約伯記_40","約伯記_41","約伯記_42"],
  "203_NT": ["哥林多前書_16"],
  "204_OT": ["詩篇_1","詩篇_2"],
  "205_OT": ["詩篇_3","詩篇_4","詩篇_5","詩篇_6","詩篇_7"],
  "205_NT": ["哥林多後書_1"],
  "206_OT": ["詩篇_8","詩篇_9","詩篇_10"],
  "206_NT": ["哥林多後書_2"],
  "207_OT": ["詩篇_11","詩篇_12","詩篇_13","詩篇_14","詩篇_15","詩篇_16"],
  "207_NT": ["哥林多後書_3"],
  "208_OT": ["詩篇_17","詩篇_18","詩篇_19"],
  "209_OT": ["詩篇_20","詩篇_21","詩篇_22"],
  "209_NT": ["哥林多後書_4"],
  "210_OT": ["詩篇_23","詩篇_24","詩篇_25"],
  "210_NT": ["哥林多後書_5"],
  "211_OT": ["詩篇_26","詩篇_27","詩篇_28","詩篇_29","詩篇_30","詩篇_31"],
  "211_NT": ["哥林多後書_6"],
  "212_OT": ["詩篇_32","詩篇_33","詩篇_34","詩篇_35"],
  "212_NT": ["哥林多後書_7"],
  "213_OT": ["詩篇_36","詩篇_37","詩篇_38"],
  "213_NT": ["哥林多後書_8","哥林多後書_9"],
  "214_OT": ["詩篇_39","詩篇_40","詩篇_41"],
  "214_NT": ["哥林多後書_10"],
  "215_OT": ["詩篇_42","詩篇_43","詩篇_44"],
  "215_NT": ["哥林多後書_11"],
  "216_OT": ["詩篇_45"],
  "216_NT": ["哥林多後書_12"],
  "217_OT": ["詩篇_46","詩篇_47","詩篇_48","詩篇_49"],
  "217_NT": ["哥林多後書_13"],
  "218_OT": ["詩篇_50","詩篇_51","詩篇_52"],
  "219_OT": ["詩篇_53","詩篇_54","詩篇_55","詩篇_56","詩篇_57","詩篇_58"],
  "219_NT": ["加拉太書_1"],
  "220_OT": ["詩篇_59","詩篇_60","詩篇_61","詩篇_62","詩篇_63","詩篇_64"],
  "220_NT": ["加拉太書_2"],
  "221_OT": ["詩篇_65","詩篇_66","詩篇_67","詩篇_68"],
  "222_OT": ["詩篇_69","詩篇_70","詩篇_71","詩篇_72"],
  "222_NT": ["加拉太書_3"],
  "223_OT": ["詩篇_73","詩篇_74","詩篇_75","詩篇_76","詩篇_77"],
  "223_NT": ["加拉太書_4"],
  "224_OT": ["詩篇_78","詩篇_79","詩篇_80","詩篇_81"],
  "225_OT": ["詩篇_82","詩篇_83","詩篇_84","詩篇_85","詩篇_86","詩篇_87"],
  "225_NT": ["加拉太書_5"],
  "226_OT": ["詩篇_88","詩篇_89","詩篇_90","詩篇_91"],
  "226_NT": ["加拉太書_6"],
  "227_OT": ["詩篇_92","詩篇_93","詩篇_94","詩篇_95","詩篇_96","詩篇_97"],
  "228_OT": ["詩篇_98","詩篇_99","詩篇_100","詩篇_101","詩篇_102","詩篇_103"],
  "229_OT": ["詩篇_104","詩篇_105","詩篇_106"],
  "229_NT": ["以弗所書_1"],
  "230_OT": ["詩篇_107","詩篇_108","詩篇_109"],
  "231_OT": ["詩篇_110","詩篇_111","詩篇_112","詩篇_113","詩篇_114","詩篇_115"],
  "232_OT": ["詩篇_116","詩篇_117","詩篇_118"],
  "232_NT": ["以弗所書_2"],
  "234_OT": ["詩篇_119","詩篇_120","詩篇_121","詩篇_122","詩篇_123","詩篇_124"],
  "234_NT": ["以弗所書_3"],
  "235_OT": ["詩篇_125","詩篇_126","詩篇_127","詩篇_128","詩篇_129","詩篇_130","詩篇_131","詩篇_132"],
  "236_OT": ["詩篇_133","詩篇_134","詩篇_135","詩篇_136","詩篇_137","詩篇_138"],
  "236_NT": ["以弗所書_4"],
  "237_OT": ["詩篇_139","詩篇_140","詩篇_141","詩篇_142","詩篇_143","詩篇_144"],
  "238_OT": ["詩篇_145","詩篇_146","詩篇_147","詩篇_148","詩篇_149","詩篇_150"],
  "238_NT": ["以弗所書_5"],
  "239_OT": ["箴言_1","箴言_2","箴言_3","箴言_4"],
  "240_OT": ["箴言_5","箴言_6","箴言_7","箴言_8","箴言_9","箴言_10","箴言_11","箴言_12"],
  "240_NT": ["以弗所書_6"],
  "241_OT": ["箴言_13","箴言_14","箴言_15","箴言_16","箴言_17","箴言_18"],
  "242_OT": ["箴言_19","箴言_20","箴言_21","箴言_22","箴言_23","箴言_24"],
  "242_NT": ["腓立比書_1"],
  "243_OT": ["箴言_25","箴言_26","箴言_27","箴言_28","箴言_29","箴言_30","箴言_31"],
  "244_OT": ["傳道書_1","傳道書_2","傳道書_3","傳道書_4","傳道書_5"],
  "244_NT": ["腓立比書_2"],
  "245_OT": ["傳道書_6","傳道書_7","傳道書_8","傳道書_9","傳道書_10","傳道書_11","傳道書_12"],
  "246_OT": ["雅歌_1"],
  "246_NT": ["腓立比書_3"],
  "247_OT": ["雅歌_2"],
  "247_NT": ["腓立比書_4"],
  "248_OT": ["雅歌_3"],
  "249_OT": ["雅歌_4"],
  "249_NT": ["歌羅西書_1"],
  "250_OT": ["雅歌_5"],
  "251_OT": ["雅歌_6"],
  "251_NT": ["歌羅西書_2"],
  "252_OT": ["雅歌_7","雅歌_8"],
  "252_NT": ["歌羅西書_3","歌羅西書_4"],
  "253_OT": ["以賽亞書_1"],
  "253_NT": ["帖撒羅尼迦前書_1"],
  "254_OT": ["以賽亞書_2","以賽亞書_3","以賽亞書_4"],
  "254_NT": ["帖撒羅尼迦前書_2"],
  "255_OT": ["以賽亞書_5","以賽亞書_6"],
  "255_NT": ["帖撒羅尼迦前書_3"],
  "256_OT": ["以賽亞書_7","以賽亞書_8"],
  "256_NT": ["帖撒羅尼迦前書_4"],
  "257_OT": ["以賽亞書_9","以賽亞書_10"],
  "257_NT": ["帖撒羅尼迦前書_5"],
  "258_OT": ["以賽亞書_11","以賽亞書_12","以賽亞書_13"],
  "258_NT": ["帖撒羅尼迦後書_1"],
  "259_OT": ["以賽亞書_14"],
  "259_NT": ["帖撒羅尼迦後書_2","帖撒羅尼迦後書_3"],
  "260_OT": ["以賽亞書_15","以賽亞書_16","以賽亞書_17","以賽亞書_18","以賽亞書_19"],
  "261_OT": ["以賽亞書_20","以賽亞書_21","以賽亞書_22"],
  "261_NT": ["提摩太前書_1"],
  "262_OT": ["以賽亞書_23","以賽亞書_24","以賽亞書_25","以賽亞書_26"],
  "262_NT": ["提摩太前書_2"],
  "263_OT": ["以賽亞書_27","以賽亞書_28"],
  "264_OT": ["以賽亞書_29","以賽亞書_30"],
  "264_NT": ["提摩太前書_3"],
  "265_OT": ["以賽亞書_31","以賽亞書_32","以賽亞書_33","以賽亞書_34","以賽亞書_35"],
  "265_NT": ["提摩太前書_4","提摩太前書_5"],
  "266_OT": ["以賽亞書_36","以賽亞書_37"],
  "266_NT": ["提摩太前書_6"],
  "267_OT": ["以賽亞書_38","以賽亞書_39","以賽亞書_40"],
  "267_NT": ["提摩太後書_1"],
  "268_OT": ["以賽亞書_41","以賽亞書_42"],
  "268_NT": ["提摩太後書_2"],
  "269_OT": ["以賽亞書_43","以賽亞書_44"],
  "269_NT": ["提摩太後書_3","提摩太後書_4"],
  "270_OT": ["以賽亞書_45","以賽亞書_46"],
  "270_NT": ["提多書_1"],
  "271_OT": ["以賽亞書_47","以賽亞書_48"],
  "271_NT": ["提多書_2"],
  "272_OT": ["以賽亞書_49"],
  "272_NT": ["提多書_3"],
  "273_OT": ["以賽亞書_50","以賽亞書_51","以賽亞書_52"],
  "273_NT": ["腓利門書_1"],
  "274_OT": ["以賽亞書_53","以賽亞書_54"],
  "275_OT": ["以賽亞書_55","以賽亞書_56"],
  "275_NT": ["希伯來書_1"],
  "276_OT": ["以賽亞書_57","以賽亞書_58"],
  "276_NT": ["希伯來書_2"],
  "277_OT": ["以賽亞書_59","以賽亞書_60"],
  "277_NT": ["希伯來書_3"],
  "278_OT": ["以賽亞書_61","以賽亞書_62"],
  "279_OT": ["以賽亞書_63","以賽亞書_64"],
  "279_NT": ["希伯來書_4"],
  "280_OT": ["以賽亞書_65","以賽亞書_66"],
  "280_NT": ["希伯來書_5"],
  "281_OT": ["耶利米書_1"],
  "281_NT": ["希伯來書_6"],
  "282_OT": ["耶利米書_2","耶利米書_3"],
  "282_NT": ["希伯來書_7"],
  "283_OT": ["耶利米書_4","耶利米書_5"],
  "283_NT": ["希伯來書_8"],
  "284_OT": ["耶利米書_6","耶利米書_7"],
  "285_OT": ["耶利米書_8","耶利米書_9"],
  "285_NT": ["希伯來書_9"],
  "286_OT": ["耶利米書_10","耶利米書_11","耶利米書_12"],
  "287_OT": ["耶利米書_13","耶利米書_14"],
  "287_NT": ["希伯來書_10"],
  "288_OT": ["耶利米書_15"],
  "289_OT": ["耶利米書_16","耶利米書_17"],
  "289_NT": ["希伯來書_11"],
  "290_OT": ["耶利米書_18","耶利米書_19"],
  "291_OT": ["耶利米書_20","耶利米書_21","耶利米書_22"],
  "292_OT": ["耶利米書_23"],
  "292_NT": ["希伯來書_12"],
  "293_OT": ["耶利米書_24","耶利米書_25","耶利米書_26","耶利米書_27"],
  "294_OT": ["耶利米書_28","耶利米書_29","耶利米書_30"],
  "294_NT": ["希伯來書_13"],
  "295_OT": ["耶利米書_31"],
  "296_OT": ["耶利米書_32","耶利米書_33"],
  "296_NT": ["雅各書_1"],
  "297_OT": ["耶利米書_34","耶利米書_35"],
  "297_NT": ["雅各書_2","雅各書_3"],
  "298_OT": ["耶利米書_36","耶利米書_37"],
  "298_NT": ["雅各書_4"],
  "299_OT": ["耶利米書_38","耶利米書_39","耶利米書_40"],
  "299_NT": ["雅各書_5"],
  "300_OT": ["耶利米書_41","耶利米書_42","耶利米書_43","耶利米書_44"],
  "301_OT": ["耶利米書_45","耶利米書_46","耶利米書_47"],
  "302_OT": ["耶利米書_48"],
  "302_NT": ["彼得前書_1"],
  "303_OT": ["耶利米書_49"],
  "304_OT": ["耶利米書_50"],
  "304_NT": ["彼得前書_2"],
  "305_OT": ["耶利米書_51","耶利米書_52"],
  "305_NT": ["彼得前書_3"],
  "306_OT": ["耶利米哀歌_1","耶利米哀歌_2"],
  "307_OT": ["耶利米哀歌_3"],
  "307_NT": ["彼得前書_4"],
  "308_OT": ["耶利米哀歌_4","耶利米哀歌_5"],
  "308_NT": ["彼得前書_5"],
  "309_OT": ["以西結書_1"],
  "310_OT": ["以西結書_2","以西結書_3","以西結書_4","以西結書_5"],
  "311_OT": ["以西結書_6","以西結書_7","以西結書_8","以西結書_9"],
  "311_NT": ["彼得後書_1"],
  "312_OT": ["以西結書_10","以西結書_11","以西結書_12"],
  "312_NT": ["彼得後書_2"],
  "313_OT": ["以西結書_13","以西結書_14","以西結書_15"],
  "314_OT": ["以西結書_16","以西結書_17"],
  "315_OT": ["以西結書_18","以西結書_19"],
  "315_NT": ["彼得後書_3"],
  "316_OT": ["以西結書_20","以西結書_21","以西結書_22"],
  "317_OT": ["以西結書_23","以西結書_24"],
  "318_OT": ["以西結書_25","以西結書_26","以西結書_27"],
  "318_NT": ["約翰一書_1"],
  "319_OT": ["以西結書_28","以西結書_29","以西結書_30"],
  "320_OT": ["以西結書_31","以西結書_32","以西結書_33"],
  "320_NT": ["約翰一書_2"],
  "321_OT": ["以西結書_34","以西結書_35"],
  "322_OT": ["以西結書_36"],
  "322_NT": ["約翰一書_3"],
  "323_OT": ["以西結書_37"],
  "323_NT": ["約翰一書_4"],
  "324_OT": ["以西結書_38","以西結書_39"],
  "325_NT": ["約翰一書_5"],
  "326_OT": ["以西結書_40","以西結書_41"],
  "326_NT": ["約翰二書_1"],
  "327_OT": ["以西結書_42","以西結書_43","以西結書_44"],
  "327_NT": ["約翰三書_1"],
  "328_OT": ["以西結書_45","以西結書_46"],
  "329_OT": ["以西結書_47","以西結書_48"],
  "329_NT": ["猶大書_1"],
  "330_OT": ["但以理書_1"],
  "331_OT": ["但以理書_2","但以理書_3"],
  "332_OT": ["但以理書_4","但以理書_5"],
  "332_NT": ["啟示錄_1"],
  "333_OT": ["但以理書_6","但以理書_7"],
  "334_OT": ["但以理書_8","但以理書_9"],
  "335_OT": ["但以理書_10"],
  "336_OT": ["但以理書_11","但以理書_12"],
  "336_NT": ["啟示錄_2"],
  "337_OT": ["何西阿書_1"],
  "338_OT": ["何西阿書_2","何西阿書_3"],
  "339_OT": ["何西阿書_4","何西阿書_5"],
  "339_NT": ["啟示錄_3"],
  "340_OT": ["何西阿書_6","何西阿書_7"],
  "340_NT": ["啟示錄_4"],
  "341_OT": ["何西阿書_8","何西阿書_9"],
  "341_NT": ["啟示錄_5"],
  "342_OT": ["何西阿書_10","何西阿書_11"],
  "342_NT": ["啟示錄_6"],
  "343_OT": ["何西阿書_12","何西阿書_13","何西阿書_14"],
  "343_NT": ["啟示錄_7"],
  "344_OT": ["約珥書_1"],
  "345_OT": ["約珥書_2","約珥書_3"],
  "345_NT": ["啟示錄_8","啟示錄_9"],
  "346_OT": ["阿摩司書_1","阿摩司書_2"],
  "346_NT": ["啟示錄_10"],
  "347_OT": ["阿摩司書_3","阿摩司書_4","阿摩司書_5"],
  "348_OT": ["阿摩司書_6","阿摩司書_7","阿摩司書_8","阿摩司書_9"],
  "348_NT": ["啟示錄_11"],
  "349_OT": ["俄巴底亞書_1"],
  "349_NT": ["啟示錄_12"],
  "350_OT": ["約拿書_1","約拿書_2","約拿書_3","約拿書_4"],
  "350_NT": ["啟示錄_13"],
  "351_OT": ["彌迦書_1","彌迦書_2","彌迦書_3"],
  "352_OT": ["彌迦書_4","彌迦書_5","彌迦書_6","彌迦書_7"],
  "352_NT": ["啟示錄_14","啟示錄_15"],
  "353_OT": ["那鴻書_1","那鴻書_2","那鴻書_3"],
  "353_NT": ["啟示錄_16"],
  "354_OT": ["哈巴谷書_1","哈巴谷書_2"],
  "354_NT": ["啟示錄_17"],
  "355_OT": ["哈巴谷書_3","西番雅書_1"],
  "355_NT": ["啟示錄_18"],
  "356_OT": ["西番雅書_2","西番雅書_3"],
  "357_OT": ["哈該書_1","哈該書_2"],
  "357_NT": ["啟示錄_19"],
  "358_OT": ["撒加利亞書_1","撒加利亞書_2"],
  "358_NT": ["啟示錄_20"],
  "359_OT": ["撒加利亞書_3","撒加利亞書_4"],
  "360_OT": ["撒加利亞書_5","撒加利亞書_6","撒加利亞書_7","撒加利亞書_8"],
  "361_OT": ["撒加利亞書_9","撒加利亞書_10","撒加利亞書_11"],
  "362_OT": ["撒加利亞書_12","撒加利亞書_13","撒加利亞書_14"],
  "362_NT": ["啟示錄_21"],
  "363_OT": ["瑪拉基書_1","瑪拉基書_2"],
  "364_OT": ["瑪拉基書_3","瑪拉基書_4"],
  "364_NT": ["啟示錄_22"]
};
// ============================================================

// 執行週期內的 Users 快取（避免同一次請求中重複讀取試算表）
let _executionUsersCache = null;

/**
 * 處理 LINE Webhook 傳入的事件
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const events = body.events || [];

    events.forEach(function(event) {
      // 用戶在群組輸入「/GET URL」（僅限大寫）時回傳讀經連結
      if (event.type === "message" &&
          event.message.type === "text" &&
          event.message.text.trim() === "/GET URL") {

        const replyToken = event.replyToken;

        if (event.source.type === "group") {
          const groupId = event.source.groupId;
          const url = WEBAPP_URL + "?groupId=" + groupId;
          replyToLine(replyToken, [{
            type: "text",
            text: "📖 本群組讀經打卡連結：\n" + url
          }]);
        } else {
          replyToLine(replyToken, [{
            type: "text",
            text: "⚠️ 此指令需在 LINE 群組中使用，Bot 才能取得群組 ID。"
          }]);
        }
      }
    });

  } catch (err) {
    Logger.log("doPost 錯誤: " + err.toString());
  }

  // LINE Webhook 需要回傳 200
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 使用 LINE Reply API 回覆訊息
 * @param {string} replyToken
 * @param {Array}  messages  - 最多 5 則訊息物件的陣列
 */
function replyToLine(replyToken, messages) {
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = JSON.stringify({ replyToken: replyToken, messages: messages });

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN },
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log("LINE Reply 回應: " + response.getResponseCode() + " " + response.getContentText());
}

/**
 * 處理網頁顯示
 */
function doGet(e) {
  const groupId = (e && e.parameter && e.parameter.groupId) ? String(e.parameter.groupId).trim() : "";
  const tmpl = HtmlService.createTemplateFromFile('index');
  tmpl.appGroupId = groupId;
  return tmpl.evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('聖經讀經進度紀錄');
}

/**
 * 產生 UUID 前 8 位作為短 UserID
 */
function generateShortUserId() {
  return Utilities.getUuid().substring(0, 8);
}

/**
 * 取得進度分頁，若无或欄位不符則自動建立
 * Schema: [UserID, GroupID, Book, Chapter, Timestamp]
 */
function getProgressSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Progress");

  if (!sheet) {
    sheet = ss.insertSheet("Progress");
    sheet.appendRow(["UserID", "GroupID", "Book", "Chapter", "Timestamp"]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange("A1:E1").getValues()[0];
    if (headers[0] !== "UserID" || headers[1] !== "GroupID") {
      // 欄位不符，清除重建（開發期間允許直接重置）
      sheet.clearContents();
      sheet.getRange("A1:E1").setValues([["UserID", "GroupID", "Book", "Chapter", "Timestamp"]]);
      sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * 取得或建立 Stats 快取工作表
 * Schema: [GroupID, UserID, OT, NT]
 */
function getOrCreateStatsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Stats");

  if (!sheet) {
    sheet = ss.insertSheet("Stats");
    sheet.appendRow(["GroupID", "UserID", "OT", "NT"]);
    sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange("A1:D1").getValues()[0];
    if (headers[0] !== "GroupID" || headers[1] !== "UserID") {
      sheet.clearContents();
      sheet.getRange("A1:D1").setValues([["GroupID", "UserID", "OT", "NT"]]);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * 重新計算指定用戶在指定群組的統計，並寫入 Stats 快取表
 * @param {string} userId
 * @param {string} groupId
 * @param {Sheet} [existingSheet] - 可選，傳入已持有的 Progress Sheet 避免重複讀取
 */
function updateUserStats(userId, groupId, existingSheet) {
  try {
    const progressSheet = existingSheet || getProgressSheet();
    const lastRow = progressSheet.getLastRow();
    if (lastRow <= 1) {
      _writeStatsRow(groupId, userId, 0, 0);
      return;
    }

    const data = progressSheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const records = [];
    data.forEach(row => {
      if (String(row[0]).trim() === userId && String(row[1]).trim() === groupId) {
        records.push({ book: String(row[2]).trim(), chapter: String(row[3]).trim() });
      }
    });

    const result = calculateUserTotalProgress("", userId, records);
    _writeStatsRow(groupId, userId, result.otChapters, result.ntChapters);
  } catch (e) {
    Logger.log("updateUserStats 錯誤: " + e.toString());
  }
}

/**
 * 寫入或更新 Stats 表中的一列
 */
function _writeStatsRow(groupId, userId, ot, nt) {
  const sheet = getOrCreateStatsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const allData = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let i = 0; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === groupId && String(allData[i][1]).trim() === userId) {
        sheet.getRange(i + 2, 3, 1, 2).setValues([[ot, nt]]);
        return;
      }
    }
  }
  sheet.appendRow([groupId, userId, ot, nt]);
}

/**
 * 儲存進度
 */
function saveProgress(data) {
  let lock;
  try {
    const safeUserId   = String((data && data.userId)   || "").trim();
    const safeGroupId  = String((data && data.groupId)  || "").trim();
    const safeUsername = String((data && data.username) || "").trim();
    const safePin      = String((data && data.pin)      || "").trim();
    const safeBook     = String((data && data.book)     || "").trim();
    const rawChapters  = Array.isArray(data && data.chapters) ? data.chapters : [];
    const safeChapters = Array.from(new Set(rawChapters.map(ch => String(ch).trim()).filter(Boolean)));

    Logger.log("saveProgress: userId='" + safeUserId + "', groupId='" + safeGroupId + "', book='" + safeBook + "', chapters=" + JSON.stringify(safeChapters));

    if (!safeUserId || !safeGroupId || !safeUsername || !safePin || !safeBook || !safeChapters.length) {
      return { status: "error", message: "儲存資料不完整", addedCount: 0, skippedCount: 0 };
    }

    const authResult = verifyUserAuth(safeUsername, safePin, safeUserId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗", addedCount: 0, skippedCount: 0 };
    }

    lock = LockService.getScriptLock();
    lock.waitLock(5000);

    const sheet = getProgressSheet();
    const now = new Date();

    // 前端已做去重，後端直接 append（不再掃全表比對）
    const rowsToInsert = safeChapters.map(chapter => [safeUserId, safeGroupId, safeBook, chapter, now]);

    if (rowsToInsert.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, 5).setValues(rowsToInsert);
    }
    Logger.log("saveProgress: 新增 " + rowsToInsert.length + " 筆");

    // 更新 Stats 快取（傳入已持有的 sheet 避免重複讀取）
    updateUserStats(safeUserId, safeGroupId, sheet);

    return { status: "success", addedCount: rowsToInsert.length };
  } catch (e) {
    Logger.log("saveProgress 錯誤: " + e.toString());
    throw new Error("試算表寫入失敗: " + e.message);
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 讀取用戶在指定群組的所有進度
 */
function getAllUserProgress(userId, username, pin, groupId) {
  try {
    const safeUserId  = String(userId  || "").trim();
    const safeGroupId = String(groupId || "").trim();
    const safeUsername = String(username || "").trim();
    const safePin      = String(pin      || "").trim();

    if (!safeGroupId) return { __error: true, message: "groupId 為空" };

    const authResult = verifyUserAuth(safeUsername, safePin, safeUserId);
    if (!authResult.authenticated) {
      return { __error: true, message: authResult.error || "身份驗證失敗" };
    }

    const sheet = getProgressSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return {};

    // 欄位順序：[UserID, GroupID, Book, Chapter, Timestamp]
    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const progressSets = {};  // 用 Set 收集，自動去重
    data.forEach(row => {
      if (String(row[0]).trim() === safeUserId && String(row[1]).trim() === safeGroupId) {
        const book    = String(row[2]).trim();
        const chapter = String(row[3]).trim();
        if (!progressSets[book]) progressSets[book] = new Set();
        progressSets[book].add(chapter);
      }
    });
    // 轉換為 Array 格式回傳（前端相容）
    const progressMap = {};
    for (const book in progressSets) {
      progressMap[book] = Array.from(progressSets[book]);
    }
    return progressMap;
  } catch (e) {
    Logger.log("getAllUserProgress 錯誤: " + e.toString());
    return { __error: true, message: e.toString() };
  }
}

/**
 * 清除用戶在指定群組的特定類別進度
 */
function clearUserProgress(userId, username, pin, type, groupId) {
  let lock;
  try {
    const safeUserId  = String(userId  || "").trim();
    const safeGroupId = String(groupId || "").trim();
    const safeUsername = String(username || "").trim();
    const safePin      = String(pin      || "").trim();
    const safeType     = String(type     || "").trim();

    if (!safeGroupId) return { status: "error", message: "groupId 為空" };
    
    // 驗證用戶身份
    const authResult = verifyUserAuth(safeUsername, safePin, safeUserId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }
    
    const VALID_TYPES = ['OT', 'NT', 'Plan', 'All'];
    if (!VALID_TYPES.includes(safeType)) {
      return { status: "error", message: "無效的 type 參數，必須為 OT／NT／Plan／All" };
    }

    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    const sheet = getProgressSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { status: "success" };
    }

    // 使用全域常數
    const otBooks = OT_BOOKS_SET;
    const ntBooks = NT_BOOKS_SET;

    // 批次讀取所有資料列（含 GroupID 與 Timestamp，共 5 欄）
    // 欄位順序：[UserID, GroupID, Book, Chapter, Timestamp]
    const allData = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    const rowsToKeep = allData.filter(row => {
      const rowUser  = String(row[0]).trim();
      const rowGroup = String(row[1]).trim();
      const rowBook  = String(row[2]).trim();
      // 不同用戶或不同群組的資料一律保留
      if (rowUser !== safeUserId || rowGroup !== safeGroupId) return true;
      if (safeType === 'OT'   && otBooks.has(rowBook)) return false;
      if (safeType === 'NT'   && ntBooks.has(rowBook)) return false;
      if (safeType === 'Plan' && rowBook === "一年讀經")    return false;
      if (safeType === 'All') return false;
      return true;
    });

    const deleteCount = allData.length - rowsToKeep.length;

    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
    if (rowsToKeep.length > 0) {
      sheet.getRange(2, 1, rowsToKeep.length, 5).setValues(rowsToKeep);
    }

    // 更新 Stats 快取
    updateUserStats(safeUserId, safeGroupId);

    return { status: "success", deletedCount: deleteCount };
  } catch (e) {
    Logger.log("clearUserProgress 錯誤: " + e.toString());
    return { status: "error", message: e.toString() };
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * 取得或建立 Users 工作表（儲存用戶名、PIN hash 和 UserID）
 */
function getOrCreateUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "PIN_Hash", "UserID"]);
    sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f3f3f3");
    // 強制整個 A 欄為文本格式（防止 "001" 被轉換為 1）
    sheet.getRange("A:A").setNumberFormat("@");
    sheet.setFrozenRows(1);
  } else {
    const headerCheck = sheet.getRange("A1").getValue();
    if (headerCheck !== "Username") {
      sheet.insertRowBefore(1);
      sheet.getRange("A1:C1").setValues([["Username", "PIN_Hash", "UserID"]]);
      sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.getRange("A:A").setNumberFormat("@");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * 計算 PIN 的 SHA256 hash
 */
function computePinHash(pin) {
  // GAS 的 Utilities.computeDigest_ 返回 byte array，需轉換為 hex string
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin);
  return Utilities.base64Encode(hash); // 用 base64 編碼作為 hash 儲存
}

/**
 * 驗證或建立用戶
 * @param {string} username - 用戶名稱
 * @param {string} pin - PIN 明文 (4 碼)
 * @return {object} { success: boolean, message: string, userId: string }
 */
function authenticateUser(username, pin) {
  try {
    const username_safe = String(username || "").trim();
    const pin_safe = String(pin || "").trim();
    
    Logger.log("authenticateUser: 嘗試登入 - username='" + username_safe + "', pin='" + pin_safe + "'");
    
    if (!username_safe || !pin_safe || pin_safe.length !== 4 || !/^\d{4}$/.test(pin_safe)) {
      Logger.log("authenticateUser: 格式驗證失敗");
      return { success: false, message: "用戶名或 PIN 格式無效" };
    }
    
    const pinHash = computePinHash(pin_safe);

    const sheet = getOrCreateUsersSheet();
    const lastRow = sheet.getLastRow();
    Logger.log("authenticateUser: Users 表共 " + lastRow + " 列");

    // 檢查用戶是否已存在（根據 username + pinHash）
    if (lastRow > 1) {
      const allUsers = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
      // 同步更新快取
      _executionUsersCache = allUsers;
      for (let i = 0; i < allUsers.length; i++) {
        const existingUsername = String(allUsers[i][0]).trim();
        const existingHash     = String(allUsers[i][1]).trim();
        const existingUserId   = String(allUsers[i][2]).trim();
        if (existingUsername === username_safe) {
          if (existingHash === pinHash) {
            Logger.log("authenticateUser: 登入成功 - userId='" + existingUserId + "'");
            return { success: true, message: "登入成功", userId: existingUserId };
          } else {
            Logger.log("authenticateUser: PIN 不正確");
            return { success: false, message: "PIN 不正確" };
          }
        }
      }
    }

    // 用戶不存在，建立新用戶（使用 UUID 前 8 位作為 UserID）
    const newUserId = generateShortUserId();
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1).setNumberFormat("@");
    sheet.getRange(newRow, 1, 1, 3).setValues([[username_safe, pinHash, newUserId]]);
    // 更新快取
    _executionUsersCache = null;
    Logger.log("authenticateUser: 新用戶建立 - userId='" + newUserId + "'");
    return { success: true, message: "新用戶建立成功", userId: newUserId };
    
  } catch (e) {
    Logger.log("authenticateUser 錯誤: " + e.toString());
    return { success: false, message: "驗證失敗: " + e.toString() };
  }
}

/**
 * 驗證用戶身份（用於其他 API 調用）
 */
function verifyUserAuth(username, pin, expectedUserId) {
  try {
    const username_safe = String(username || "").trim();
    const pin_safe = String(pin || "").trim();
    
    if (!username_safe || !pin_safe || pin_safe.length !== 4 || !/^\d{4}$/.test(pin_safe)) {
      return { authenticated: false, error: "用戶名或 PIN 格式無效" };
    }

    const pinHash = computePinHash(pin_safe);

    // 使用執行週期內快取，避免同次請求中多次讀取試算表
    if (!_executionUsersCache) {
      const sheet = getOrCreateUsersSheet();
      const lastRow = sheet.getLastRow();
      _executionUsersCache = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 3).getValues() : [];
    }
    const allUsers = _executionUsersCache;

    if (allUsers.length === 0) {
      return { authenticated: false, error: "用戶不存在" };
    }
    
    for (let i = 0; i < allUsers.length; i++) {
      const existingUsername = String(allUsers[i][0]).trim();
      const existingHash = String(allUsers[i][1]).trim();
      const existingUserId = String(allUsers[i][2]).trim();
      
      if (existingUsername === username_safe && existingHash === pinHash) {
        if (expectedUserId && existingUserId !== expectedUserId) {
          Logger.log("verifyUserAuth: UserID 不匹配");
          return { authenticated: false, error: "UserID 不匹配" };
        }
        return { authenticated: true };
      }
    }
    
    return { authenticated: false, error: "身份驗證失敗" };
  } catch (e) {
    Logger.log("verifyUserAuth 錯誤: " + e.toString());
    return { authenticated: false, error: e.toString() };
  }
}

/**
 * 計算用戶總進度（依據一年讀經或自由讀章數）
 * 若完成至少一天一年讀經，則視為使用一年計畫，僅以等效章數回傳；否則計算自由讀。
 * @param {string} username 
 * @param {string} userId 
 * @param {Array} records [{book, chapter}, ...]
 */
function calculateUserTotalProgress(username, userId, records) {
  const readOT = new Set();
  const readNT = new Set();
  let planCompletedDays = 0;
  const planDaysMap = {};
  
  // 使用全域常數
  const otBooks = OT_BOOKS_SET;
  const ntBooks = NT_BOOKS_SET;

  records.forEach(r => {
    if (r.book === "一年讀經") {
      const match = String(r.chapter).match(/^(\d+)_(OT|NT)$/);
      if (match) {
        const day = match[1];
        const testament = match[2];
        if (!planDaysMap[day]) planDaysMap[day] = { OT: false, NT: false };
        planDaysMap[day][testament] = true;
      }
    } else {
      if (otBooks.has(r.book)) {
        readOT.add(`${r.book}_${r.chapter}`);
      } else if (ntBooks.has(r.book)) {
        readNT.add(`${r.book}_${r.chapter}`);
      }
    }
  });

  for (let day = 1; day <= TOTAL_PLAN_DAYS; day++) {
    if (planDaysMap[day] && planDaysMap[day].OT && planDaysMap[day].NT) {
      planCompletedDays++;
    }
    
    // 如果這天有讀舊約或新約，就把映射表的章節加進去
    if (planDaysMap[day] && planDaysMap[day].OT) {
      let mapped = PLAN_CHAPTER_MAPPING[`${day}_OT`];
      if (mapped) {
        if (!Array.isArray(mapped)) mapped = [mapped];
        mapped.forEach(c => readOT.add(c));
      }
    }
    if (planDaysMap[day] && planDaysMap[day].NT) {
      let mapped = PLAN_CHAPTER_MAPPING[`${day}_NT`];
      if (mapped) {
        if (!Array.isArray(mapped)) mapped = [mapped];
        mapped.forEach(c => readNT.add(c));
      }
    }
  }

  return {
    username: username,
    userId: userId,
    otChapters: readOT.size,
    ntChapters: readNT.size,
    source: (planCompletedDays > 0) ? 'plan' : 'free',
    planDays: planCompletedDays
  };
}

/**
 * 取得群組內所有成員的進度統計（從 Stats 快取表讀取）
 * @param {string} groupId 
 * @param {string} userId - 用於驗證
 * @param {string} username - 用於驗證
 * @param {string} pin - 用於驗證
 */
function getGroupMemberStats(groupId, userId, username, pin) {
  try {
    const safeGroupId = String(groupId || "").trim();
    
    // 驗證呼叫者
    const authResult = verifyUserAuth(username, pin, userId);
    if (!authResult.authenticated) {
      return { status: "error", message: authResult.error || "身份驗證失敗" };
    }
    
    if (!safeGroupId) {
      return { status: "error", message: "groupId 為空" };
    }

    // 從 Stats 快取表讀取（不再掃描 Progress 全表）
    const statsSheet = getOrCreateStatsSheet();
    const lastRow = statsSheet.getLastRow();
    
    if (lastRow <= 1) {
      return { status: "success", members: [], totalOT: TOTAL_OT_CHAPTERS, totalNT: TOTAL_NT_CHAPTERS };
    }

    const statsData = statsSheet.getRange(2, 1, lastRow - 1, 4).getValues();
    
    // 從 _executionUsersCache 取得用戶名對應（verifyUserAuth 已讀取並快取）
    const usersData = _executionUsersCache || [];
    const userIdToName = {};
    usersData.forEach(r => {
      userIdToName[String(r[2]).trim()] = String(r[0]).trim();
    });

    const members = [];
    statsData.forEach(row => {
      const gId = String(row[0]).trim();
      if (gId === safeGroupId) {
        const uId = String(row[1]).trim();
        members.push({
          username: userIdToName[uId] || "未知用戶",
          userId: uId,
          otChapters: Number(row[2]) || 0,
          ntChapters: Number(row[3]) || 0
        });
      }
    });
    
    return { 
      status: "success", 
      members: members, 
      totalOT: TOTAL_OT_CHAPTERS, 
      totalNT: TOTAL_NT_CHAPTERS 
    };
  } catch (e) {
    Logger.log("getGroupMemberStats 錯誤: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}