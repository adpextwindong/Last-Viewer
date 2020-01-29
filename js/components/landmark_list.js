module.exports = {
    //TODO locales
    locales : {
        en: {

        },
        jp: {
            //TODO landmark translation and clean up of landmark names
                        
            'Arch1' : '!TODO',
            'Arch2' : '!TODO',
            'Cuneiform point' : '!TODO',
            'Head of 2nd metatarsal bone' : '!TODO',
            'Inside ball point' : '!TODO',
            'Inside heel born point' : '!TODO',
            'Junction point' : '!TODO',
            'Landing point' : '!TODO',
            'Landing point2' : '!TODO',
            'Lateral point of Heel Breadth2' : '!TODO',
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
            'Medial point of Heel Breadth2' : '!TODO',
            'Metatarsale fibulare' : '!TODO',
            'Metatarsale tibiale' : '!TODO',
            'Navicular' : '!TODO',
            'Outside ball point' : '!TODO',
            'Pternion' : '!TODO',
            'Sphyrion' : '!TODO',
            'Sphyrion fibulare' : '!TODO',
            'Tentative junction point' : '!TODO',
            'The most lateral point of lateral malleolus' : '!TODO',
            'The most medial point of medial malleolus' : '!TODO',
            'Tip of #1 toe' : '!TODO',
            'Tip of #2 toe' : '!TODO',
            'Tip of #3 toe' : '!TODO',
            'Tip of #4 toe' : '!TODO',
            'Tip of #5 toe' : '!TODO',
            'Toe #1 joint' : '!TODO',
            'Toe #1 touched point' : '!TODO',
            'Toe #2 joint' : '!TODO',
            'Toe #4 joint' : '!TODO',
            'Toe #5 joint' : '!TODO',
            'Toe #5 touched point' : '!TODO',
            'Top of head of #1 Metatarsal' : '!TODO',
            'Tuberosity of 5th metatarsalis' : '!TODO',
            'Upper point of the heel' : '!TODO',

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