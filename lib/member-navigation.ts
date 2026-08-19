export type MemberNavItem={label:string;href:string;description:string};
export type MemberNavGroup={label:string;items:MemberNavItem[]};

export const memberNavGroups:MemberNavGroup[]=[
  {label:'My Work',items:[
    {label:'Home',href:'/member',description:'Priorities and progress'},
    {label:'Projects',href:'/member/projects',description:'Your Mettelo Labs'},
    {label:'Applications',href:'/member/applications',description:'Status and team formation'},
    {label:'Proof',href:'/member/proof',description:'Verified evidence'},
    {label:'Profile',href:'/member/profile',description:'Your professional identity'}
  ]},
  {label:'Explore',items:[
    {label:'Discover',href:'/member/discover',description:'Browse projects'},
    {label:'Recommended',href:'/member/recommended',description:'Matched to your profile'},
    {label:'Opportunities',href:'/opportunities',description:'Jobs and internships'},
    {label:'Saved',href:'/member/saved-opportunities',description:'Revisit later'},
    {label:'Events',href:'/member/events',description:'Mettelo-wide events'}
  ]},
  {label:'Reputation',items:[
    {label:'Spotlight',href:'/member/spotlight',description:'Recognition and consent'}
  ]}
];

export const mobilePersistentNav:MemberNavItem[]=[
  {label:'Home',href:'/member',description:'Priorities'},
  {label:'Projects',href:'/member/projects',description:'Your projects'},
  {label:'Discover',href:'/member/discover',description:'Find projects'},
  {label:'Proof',href:'/member/proof',description:'Verified evidence'},
  {label:'More',href:'#member-more',description:'More of My Mettelo'}
];

export const mobileMoreNav:MemberNavItem[]=[
  {label:'Applications',href:'/member/applications',description:'Status and formation'},
  {label:'Recommended',href:'/member/recommended',description:'Profile-matched projects'},
  {label:'Opportunities',href:'/opportunities',description:'Jobs and internships'},
  {label:'Saved',href:'/member/saved-opportunities',description:'Revisit later'},
  {label:'Events',href:'/member/events',description:'Mettelo-wide events'},
  {label:'Spotlight',href:'/member/spotlight',description:'Recognition and consent'},
  {label:'Profile',href:'/member/profile',description:'Your professional identity'}
];
