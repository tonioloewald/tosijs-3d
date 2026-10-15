import{fu,Ye,ai}from"./site-rhk48zyv.js";import{He,P}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class p_ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",P,e.type),this.value=this.registerDataOutput("value",P),this.index=this.registerDataInput("index",P,new He(ai(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=fu(e.assetsContext,s,ai(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function m_(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",p_)}m_();
export{p_,m_};

//# debugId=2AE5B977523665ED64756E2164756E21
//# sourceMappingURL=site-f4qeq9qf.js.map
