import{KB as k}from"./site-7yyjqnkq.js";var y=!1;function C(){if(y)return;y=!0,k.prototype.getRenderPassNames=function(){return this._renderPassNames},k.prototype.getCurrentRenderPassName=function(){return this._renderPassNames[this.currentRenderPassId]},k.prototype.createRenderPassId=function(l){let f=++k._RenderPassIdCounter;return this._renderPassNames[f]=l??"NONAME",f},k.prototype.releaseRenderPassId=function(l){this._renderPassNames[l]=void 0;for(let f=0;f<this.scenes.length;++f){let x=this.scenes[f];for(let v=0;v<x.meshes.length;++v){let q=x.meshes[v];if(q._releaseRenderPassId(l),q.subMeshes)for(let w=0;w<q.subMeshes.length;++w)q.subMeshes[w]._removeDrawWrapper(l)}}}}
export{C as Fm};

//# debugId=135AAA5C80DE820564756E2164756E21
//# sourceMappingURL=site-fa3k533k.js.map
