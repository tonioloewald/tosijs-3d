import{$e,ci}from"./site-scdwvr9t.js";import{Ye,O}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class hm extends $e{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",O),this.index=this.registerDataInput("index",O,new Ye(-1)),this.value=this.registerDataOutput("value",O)}_updateOutputs(e){let r=this.array.getValue(e),t=ci(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function dm(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",hm)}dm();
export{hm,dm};

//# debugId=9A99CDDF7E34DA3D64756E2164756E21
//# sourceMappingURL=site-n571h2tr.js.map
