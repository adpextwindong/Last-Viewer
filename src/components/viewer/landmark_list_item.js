//This module refers to fields in SceneLandmark

export default {
    locales : {
        en: {
            'LM20' : 'Medial point of Heel Breadth',
            'LM21' : 'Lateral point of Heel Breadth',
            'LM22' : 'Farthest point from Pternion',
            'LM25' : 'Highest point of Ballgirth Circ',
            'LM26' : 'Highest point of Instep Circ',
            'LM27' : 'Foot length point Pternion-CP axis',
            'LM32' : 'Foot length point Pternion-#2 Metatarsal head axis',
            'LM33' : 'Highest point of Instep without the case of 50% of foot length',
            'LM34' : 'Upper point of heel angle',
            'LM35' : 'Lower point of heel angle',
            'LM36' : 'Foot bottom Point 1(around Heel bone)',
            'LM37' : 'Foot bottom Point 2',
            'LM38' : 'Foot bottom Point 3',
        },
        jp: {
            'Arch1' : '土踏まず点1',
            'Arch2' : '土踏まず点2',
            'Cuneiform point' : '楔状骨',
            'Head of 2nd metatarsal bone' : '第2中足骨頭',
            'Inside heel born point' : '踵骨内側点',
            'Junction point' : '移行点',
            'Lateral point of Heel Breadth2' : 'かかと幅点2 (外）',
            'Medial point of Heel Breadth2' : 'かかと幅点1(内）',
            'Metatarsale fibulare' : '第5中足骨頭',
            'Metatarsale tibiale' : '第1中足骨頭',
            'Navicular' : '舟状骨点',        
            'Pternion' : '踵点',
            'Sphyrion' : '内果端点',
            'Sphyrion fibulare' : '外果端点',
            'Tentative junction point' : '外側移行点(仮移行点）',
            'The most lateral point of lateral malleolus' : '外果最突点',
            'The most medial point of medial malleolus' : '内果最突点',
            'Tip of #1 toe' : '第1指指先点',
            'Tip of #2 toe' : '第2指指先点',
            'Tip of #3 toe' : '第3指指先点',
            'Tip of #4 toe' : '第4指指先点',
            'Tip of #5 toe' : '第5指指先点',
            'Toe #1 joint' : '母指第一関節点',
            'Toe #2 joint' : '第2指関節点',
            'Toe #4 joint' : '第4指関節点',
            'Toe #5 joint' : '小指第一関節点',
            'Toe #5 touched point' : '小指接点',
            'Top of head of #1 Metatarsal' : '第1中足骨頭最高点',
            'Tuberosity of 5th metatarsalis' : '第5中足骨粗面',
            'Upper point of the heel' : '踵骨上部点',
            'Inside ball point' : '足囲内側',
            'Outside ball point' : '足囲外側',
            
            'LM27' : 'IV！丁-！中点足軸時の足長点',
            'LM20' : 'かかと幅点1（内）',
            'LM21' : 'かかと幅点2（外）',
            'LM22' : '最長点（つま先）',
            'LM25' : '足囲局',
            'LM26' : 'インステップ囲高（足長の50%）',
            
            'LM32' : '第2指中足骨頭足軸時の足長点',
            'LM33' : '足高点（足長の50%以外）',
            'LM34' : '踵角度点上',
            'LM35' : '踵角度点下',
            'LM36' : '足裏1（踵辺り)',
            'LM37' : '足裏2（踏みつけ内）',
            'LM38' : '足裏3（踏みつけ外）',

            'Toe #1 touched point' : '母指接点',
            'Landing point' : '接地点',
            'Landing point2' : '接地点',
        },
    },
    template : `
        <ul>
            <li v-for="landmark in landmark_group">
                <span v-bind:class="{ active: landmark.isActive }">{{t(landmark.description)}}</span>
            </li>
        </ul>
    `,
    props: ['landmark_group'],
};