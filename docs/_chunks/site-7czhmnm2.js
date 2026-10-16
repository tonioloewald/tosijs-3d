import{fu,Ye,ai}from"./site-n1qmzpg8.js";import{He,P}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class p_ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",P,e.type),this.value=this.registerDataOutput("value",P),this.index=this.registerDataInput("index",P,new He(ai(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=fu(e.assetsContext,s,ai(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function m_(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",p_)}m_();
export{p_,m_};

//# debugId=2AE5B977523665ED64756E2164756E21
//# sourceMappingURL=site-7czhmnm2.js.map
