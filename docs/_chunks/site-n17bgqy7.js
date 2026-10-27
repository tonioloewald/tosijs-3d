import{Ye,li}from"./site-v7dfb6ky.js";import{He,P}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class nm extends Ye{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",P),this.index=this.registerDataInput("index",P,new He(-1)),this.value=this.registerDataOutput("value",P)}_updateOutputs(e){let r=this.array.getValue(e),t=li(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function om(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",nm)}om();
export{nm,om};

//# debugId=A5E1FB7C7F938B6164756E2164756E21
//# sourceMappingURL=site-n17bgqy7.js.map
