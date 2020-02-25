module.exports = {
    //TODO locales
    locales : {
        en: {

        },
        jp: {
            //TODO landmark translation and clean up of landmark names
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
            
            'Inside ball point' : '!TODO',
            'Toe #1 touched point' : '母指接点 ?CHECK',
            'Landing point' : '接地点 ?CHECK',

            'Landing point2' : '!TODO',
            'Outside ball point' : '!TODO', //Most Lateral point of BallGirth ??
            
            'LM20' : '!TODO',
            'LM21' : '!TODO',
            'LM22' : '!TODO',
            'LM25' : '!TODO',
            'LM26' : '!TODO',
            'LM27' : '!TODO',
            'LM32' : '!TODO',
            'LM33' : '!TODO',
            'LM34' : '!TODO',
            'LM35' : '!TODO',
            'LM36' : '!TODO',
            'LM37' : '!TODO',
            'LM38' : '!TODO',

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
}