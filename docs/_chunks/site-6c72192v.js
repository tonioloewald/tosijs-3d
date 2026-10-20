import{pu,Ye,ai}from"./site-4r99kqsd.js";import{He,P}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class p_ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",P,e.type),this.value=this.registerDataOutput("value",P),this.index=this.registerDataInput("index",P,new He(ai(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=pu(e.assetsContext,s,ai(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function m_(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",p_)}m_();
export{p_,m_};

//# debugId=A504FE7D4C3FEB7364756E2164756E21
//# sourceMappingURL=site-6c72192v.js.map
