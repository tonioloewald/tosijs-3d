import{du,Ye,oi}from"./site-c6g1b76s.js";import{He,I}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class u_ extends Ye{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",I,e.type),this.value=this.registerDataOutput("value",I),this.index=this.registerDataInput("index",I,new He(oi(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=du(e.assetsContext,s,oi(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function h_(){if(t)return;t=!0,a("FlowGraphGetAssetBlock",u_)}h_();
export{u_,h_};

//# debugId=17D85C84B7AECE4A64756E2164756E21
//# sourceMappingURL=site-a2gqabcb.js.map
