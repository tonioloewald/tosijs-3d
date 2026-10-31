import{Xe,li}from"./site-3hzw4f8j.js";import{He,O}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class cm extends Xe{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",O),this.index=this.registerDataInput("index",O,new He(-1)),this.value=this.registerDataOutput("value",O)}_updateOutputs(e){let r=this.array.getValue(e),t=li(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function um(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",cm)}um();
export{cm,um};

//# debugId=66D7290D96045D8064756E2164756E21
//# sourceMappingURL=site-7hptvceq.js.map
