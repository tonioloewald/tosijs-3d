import{ze,Jt}from"./site-z8mqhr1b.js";import{Ve,R}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class np extends ze{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",R),this.index=this.registerDataInput("index",R,new Ve(-1)),this.value=this.registerDataOutput("value",R)}_updateOutputs(e){let r=this.array.getValue(e),t=Jt(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var i=!1;function ap(){if(i)return;i=!0,a("FlowGraphArrayIndexBlock",np)}ap();
export{np,ap};

//# debugId=1670343D9B372A7A64756E2164756E21
//# sourceMappingURL=site-7gy6577p.js.map
