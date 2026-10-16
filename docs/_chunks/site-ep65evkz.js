import{fu,Ye,ai}from"./site-e0k6q2az.js";import{He,P}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class p_ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",P,e.type),this.value=this.registerDataOutput("value",P),this.index=this.registerDataInput("index",P,new He(ai(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=fu(e.assetsContext,s,ai(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function m_(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",p_)}m_();
export{p_,m_};

//# debugId=2AE5B977523665ED64756E2164756E21
//# sourceMappingURL=site-ep65evkz.js.map
