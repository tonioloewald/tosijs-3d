import{$e,ci}from"./site-2z9zdtr9.js";import{Ye,w}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class mm extends $e{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",w),this.index=this.registerDataInput("index",w,new Ye(-1)),this.value=this.registerDataOutput("value",w)}_updateOutputs(e){let r=this.array.getValue(e),t=ci(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function gm(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",mm)}gm();
export{mm,gm};

//# debugId=FACE64638142C86364756E2164756E21
//# sourceMappingURL=site-heeyhs8a.js.map
