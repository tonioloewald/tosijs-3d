import{$e,ci}from"./site-3t3g319r.js";import{Ye,w}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class vm extends $e{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",w),this.index=this.registerDataInput("index",w,new Ye(-1)),this.value=this.registerDataOutput("value",w)}_updateOutputs(e){let r=this.array.getValue(e),t=ci(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function Sm(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",vm)}Sm();
export{vm,Sm};

//# debugId=FA82DA80332E5DC864756E2164756E21
//# sourceMappingURL=site-phdfjndt.js.map
