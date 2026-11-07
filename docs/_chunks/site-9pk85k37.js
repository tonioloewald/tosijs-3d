import{$e,ci}from"./site-ktydmw50.js";import{Ye,O}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class pm extends $e{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",O),this.index=this.registerDataInput("index",O,new Ye(-1)),this.value=this.registerDataOutput("value",O)}_updateOutputs(e){let r=this.array.getValue(e),t=ci(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function mm(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",pm)}mm();
export{pm,mm};

//# debugId=D0D97E122B88EBFB64756E2164756E21
//# sourceMappingURL=site-9pk85k37.js.map
