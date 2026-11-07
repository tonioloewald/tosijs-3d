import{$e}from"./site-ktydmw50.js";import{Ye,O,Qt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class gm extends $e{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",O),this.array=this.registerDataInput("array",O),this.index=this.registerDataOutput("index",Qt,new Ye(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new Ye(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function _m(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",gm)}_m();
export{gm,_m};

//# debugId=30FD41D1B34B0F1764756E2164756E21
//# sourceMappingURL=site-1234hwt3.js.map
