import{pu,$e,ci}from"./site-x0v5x8t1.js";import{Ye,w}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Pg extends $e{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",w,e.type),this.value=this.registerDataOutput("value",w),this.index=this.registerDataInput("index",w,new Ye(ci(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=pu(e.assetsContext,s,ci(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function Mg(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",Pg)}Mg();
export{Pg,Mg};

//# debugId=A41E1929EC576FD264756E2164756E21
//# sourceMappingURL=site-pdy6fcyh.js.map
